import type {
  AndroidDevice,
  ConnectionType,
  ControlHubLikelihood,
  DeviceAuthorization,
  DeviceOnlineState,
  DeviceProvider,
  LogEntry,
  LogOptions,
} from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import { parseAdbInstallOutput } from "./parse-adb-install.js";
import { inferConnectionType, inferControlHubLikelihood } from "./device-heuristics.js";
import { parseLogcatLine } from "../logcat/parse.js";

export class AdbDeviceProvider implements DeviceProvider {
  private readonly propertyCache = new Map<string, Record<string, string>>();

  constructor(
    private readonly runner: ProcessRunner,
    private readonly adbPath: string,
  ) {}

  async listDevices(): Promise<AndroidDevice[]> {
    const result = await this.runner.run(
      { command: this.adbPath, args: ["devices", "-l"] },
      { timeoutMs: 20_000 },
    );
    if (result.exitCode !== 0) {
      throw Object.assign(new Error(result.stderr || "adb devices failed"), {
        code: "ADB_DEVICES_FAILED",
        technicalDetails: result.stderr,
      });
    }
    const basic = parseAdbDevicesOutput(result.stdout);
    const enriched: AndroidDevice[] = [];
    for (const device of basic) {
      if (device.state !== "device") {
        enriched.push(device);
        continue;
      }
      enriched.push(await this.enrichDevice(device));
    }
    return enriched;
  }

  async installApk(device: AndroidDevice, apkPath: string): Promise<void> {
    const result = await this.runner.run(
      {
        command: this.adbPath,
        args: ["-s", device.serial, "install", "-r", apkPath],
      },
      { timeoutMs: 300_000 },
    );
    const combined = `${result.stdout}\n${result.stderr}`;
    const parsed = parseAdbInstallOutput(combined);
    if (!parsed.success || result.exitCode !== 0) {
      if (!parsed.success && parsed.code && parsed.message) {
        throw Object.assign(new Error(parsed.message), {
          code: parsed.code,
          technicalDetails: combined,
        });
      }
      throw Object.assign(new Error("APK installation failed."), {
        code: "INSTALL_FAILED",
        technicalDetails: combined,
      });
    }
  }

  async launchApp(device: AndroidDevice, applicationId: string): Promise<void> {
    // Prefer monkey launcher which works without a specific activity name.
    const result = await this.runner.run(
      {
        command: this.adbPath,
        args: [
          "-s",
          device.serial,
          "shell",
          "monkey",
          "-p",
          applicationId,
          "-c",
          "android.intent.category.LAUNCHER",
          "1",
        ],
      },
      { timeoutMs: 60_000 },
    );
    if (result.exitCode !== 0) {
      throw Object.assign(new Error("Failed to launch application."), {
        code: "LAUNCH_FAILED",
        technicalDetails: `${result.stdout}\n${result.stderr}`,
      });
    }
  }

  async *streamLogs(device: AndroidDevice, options: LogOptions = {}): AsyncIterable<LogEntry> {
    const args = ["-s", device.serial, "logcat", "-v", "threadtime"];
    if (options.clearBefore) {
      await this.runner.run(
        { command: this.adbPath, args: ["-s", device.serial, "logcat", "-c"] },
        { timeoutMs: 15_000, signal: options.signal },
      );
    }
    if (options.signal?.aborted) {
      return;
    }
    const handle = this.runner.spawn({ command: this.adbPath, args }, { signal: options.signal });
    try {
      for await (const line of handle.stdout) {
        if (options.signal?.aborted) {
          break;
        }
        const entry = parseLogcatLine(line);
        if (shouldDisplay(entry, options.filter ?? "all")) {
          yield entry;
        }
      }
    } finally {
      if (options.signal?.aborted) {
        handle.kill("SIGTERM");
      }
    }
  }

  private async enrichDevice(device: AndroidDevice): Promise<AndroidDevice> {
    const props = await this.readProperties(device.serial, [
      "ro.product.model",
      "ro.product.manufacturer",
      "ro.product.name",
      "ro.product.device",
      "ro.build.product",
    ]);
    const model = props["ro.product.model"];
    const manufacturer = props["ro.product.manufacturer"];
    const product =
      props["ro.product.name"] ?? props["ro.product.device"] ?? props["ro.build.product"];
    return {
      ...device,
      model,
      manufacturer,
      product,
      connectionType: inferConnectionType(device.serial),
      controlHubLikelihood: inferControlHubLikelihood({ model, manufacturer, product, props }),
      rawProperties: props,
    };
  }

  private async readProperties(serial: string, keys: string[]): Promise<Record<string, string>> {
    const all = await this.readAllProperties(serial);
    const props: Record<string, string> = {};
    for (const key of keys) {
      const value = all[key];
      if (value) {
        props[key] = value;
      }
    }
    return props;
  }

  private async readAllProperties(serial: string): Promise<Record<string, string>> {
    const cached = this.propertyCache.get(serial);
    if (cached) {
      return cached;
    }
    const props: Record<string, string> = {};
    try {
      const result = await this.runner.run(
        { command: this.adbPath, args: ["-s", serial, "shell", "getprop"] },
        { timeoutMs: 15_000 },
      );
      if (result.exitCode === 0) {
        for (const line of result.stdout.split(/\r?\n/)) {
          const match = line.match(/^\[([^\]]+)\]:\s*\[(.*)\]\s*$/);
          if (match) {
            const key = match[1]!;
            const value = match[2]!;
            if (value) {
              props[key] = value;
            }
          }
        }
      }
    } catch {
      // fall through — return partial/empty
    }
    this.propertyCache.set(serial, props);
    return props;
  }
}

export function parseAdbDevicesOutput(output: string): AndroidDevice[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const devices: AndroidDevice[] = [];
  for (const line of lines) {
    if (line.toLowerCase().startsWith("list of devices")) {
      continue;
    }
    const match = line.match(/^(\S+)\s+(\S+)(.*)$/);
    if (!match) {
      continue;
    }
    const serial = match[1]!;
    const stateToken = match[2]!;
    const rest = match[3] ?? "";
    const state = mapState(stateToken);
    const props = parseKeyValues(rest);
    devices.push({
      serial,
      state,
      authorization:
        state === "unauthorized" ? "unauthorized" : state === "device" ? "authorized" : "unknown",
      model: props.model,
      product: props.product,
      connectionType: inferConnectionType(serial),
      controlHubLikelihood: "unknown",
      rawProperties: props,
    });
  }
  return devices;
}

function mapState(token: string): DeviceOnlineState {
  switch (token) {
    case "device":
      return "device";
    case "offline":
      return "offline";
    case "unauthorized":
      return "unauthorized";
    default:
      return "other";
  }
}

function parseKeyValues(rest: string): Record<string, string> {
  const result: Record<string, string> = {};
  const matches = rest.matchAll(/(\S+):(\S+)/g);
  for (const match of matches) {
    result[match[1]!] = match[2]!;
  }
  return result;
}

function shouldDisplay(entry: LogEntry, filter: LogOptions["filter"]): boolean {
  if (!filter || filter === "all" || filter === "raw") {
    return true;
  }
  if (filter === "errors") {
    return /E|F|WTF/i.test(entry.level);
  }
  if (filter === "teamcode") {
    return /teamcode|opmode|ftcrobotcontroller|robotcore/i.test(`${entry.tag} ${entry.message}`);
  }
  return true;
}

export type { DeviceAuthorization, ConnectionType, ControlHubLikelihood };
