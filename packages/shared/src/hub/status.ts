import { discoverAdb } from "../discovery/adb-discovery.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { DeviceProvider } from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_ROBOT_CONSOLE_URL } from "../wifi/defaults.js";
import { probeRobotConsole } from "../wifi/probe-console.js";
import { selectDeploymentDevice } from "../devices/selection.js";
import type { FetchLike } from "../sdk/types.js";
import { parseOsVersionFromConsoleHtml } from "./parse-os-catalog.js";
import type { HubDeviceInfo, HubStatusReport, HubUpdateConnection } from "./types.js";

export interface GetHubStatusOptions {
  runner: ProcessRunner;
  deviceProvider?: DeviceProvider;
  deviceSerial?: string;
  consoleUrl?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}

export async function getHubStatus(options: GetHubStatusOptions): Promise<HubStatusReport> {
  const generatedAt = new Date().toISOString();
  const consoleUrl = (options.consoleUrl ?? DEFAULT_ROBOT_CONSOLE_URL).replace(/\/$/, "");
  const warnings: string[] = [];

  const consoleProbe = await probeRobotConsole({
    url: consoleUrl,
    fetchImpl: options.fetchImpl,
    signal: options.signal,
  });

  let consoleOsVersion: string | undefined;
  if (consoleProbe.reachable) {
    try {
      const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
      if (fetchImpl) {
        const manageUrls = [`${consoleUrl}/manage`, `${consoleUrl}/`];
        for (const url of manageUrls) {
          const res = await fetchImpl(url, { method: "GET", signal: options.signal });
          if (!res.ok) {
            continue;
          }
          const html = await res.text();
          consoleOsVersion = parseOsVersionFromConsoleHtml(html);
          if (consoleOsVersion) {
            break;
          }
        }
      }
    } catch {
      warnings.push("Could not scrape OS version from Robot Controller Console.");
    }
  }

  let deviceInfo: HubDeviceInfo | undefined;
  try {
    const provider = options.deviceProvider ?? (await createDefaultProvider(options.runner));
    const devices = await provider.listDevices();
    const selection = selectDeploymentDevice({
      devices,
      explicitSerial: options.deviceSerial,
    });
    const selected = selection.ok ? selection.device : undefined;

    if (selected && selected.state === "device") {
      const adb = await discoverAdb(options.runner);
      const props = adb.found && adb.adbPath
        ? await readProps(options.runner, adb.adbPath, selected.serial, [
            "ro.product.model",
            "ro.product.manufacturer",
            "ro.build.display.id",
            "ro.build.version.incremental",
            "ro.build.version.release",
            "ro.rev.os.version",
            "ro.revos.version",
            "persist.rev.os.version",
          ])
        : {};
      const rcVersion =
        adb.found && adb.adbPath
          ? await readRobotControllerVersion(options.runner, adb.adbPath, selected.serial)
          : undefined;
      const adbOsVersion =
        props["ro.rev.os.version"] ??
        props["ro.revos.version"] ??
        props["persist.rev.os.version"] ??
        extractOsFromDisplayId(props["ro.build.display.id"]);

      const osVersionSources: string[] = [];
      let osVersion = adbOsVersion;
      if (adbOsVersion) {
        osVersionSources.push("adb");
      }
      if (consoleOsVersion) {
        osVersionSources.push("console");
        osVersion = osVersion ?? consoleOsVersion;
        if (adbOsVersion && consoleOsVersion && adbOsVersion !== consoleOsVersion) {
          warnings.push(
            `OS version mismatch between adb (${adbOsVersion}) and console (${consoleOsVersion}); reporting adb value when present.`,
          );
          osVersion = adbOsVersion;
        }
      }

      deviceInfo = {
        serial: selected.serial,
        model: selected.model ?? props["ro.product.model"],
        manufacturer: selected.manufacturer ?? props["ro.product.manufacturer"],
        connection: connectionOf(selected.serial),
        controlHubLikelihood: selected.controlHubLikelihood,
        osVersion,
        osVersionSources,
        robotControllerVersion: rcVersion,
        rawProperties: { ...selected.rawProperties, ...props },
      };

      if (deviceInfo.connection === "wifi-adb") {
        warnings.push(
          "Device is connected over Wi-Fi adb. Prefer USB for OS apply (`--allow-wifi-adb` required to proceed).",
        );
      }
    } else if (devices.length === 0) {
      warnings.push("No adb devices connected; status uses console probe only.");
    } else {
      warnings.push("No usable authorized device selected for hub status.");
    }
  } catch (error) {
    warnings.push(interpretFromUnknown(error).summary);
  }

  if (!deviceInfo?.osVersion && consoleOsVersion) {
    deviceInfo = {
      connection: "none",
      osVersion: consoleOsVersion,
      osVersionSources: ["console"],
      rawProperties: {},
    };
  }

  const message = buildStatusMessage(deviceInfo, consoleProbe.reachable, consoleUrl);

  return {
    device: deviceInfo,
    consoleReachable: consoleProbe.reachable,
    consoleUrl,
    message,
    generatedAt,
    warnings,
  };
}

async function createDefaultProvider(runner: ProcessRunner): Promise<DeviceProvider> {
  const { AdbDeviceProvider } = await import("../devices/adb-device-provider.js");
  const adb = await discoverAdb(runner);
  if (!adb.found || !adb.adbPath) {
    throw Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" });
  }
  return new AdbDeviceProvider(runner, adb.adbPath);
}

function connectionOf(serial: string): HubUpdateConnection {
  return serial.includes(":") ? "wifi-adb" : "usb";
}

function extractOsFromDisplayId(displayId?: string): string | undefined {
  if (!displayId) {
    return undefined;
  }
  const m = displayId.match(/(\d+\.\d+(?:\.\d+)?)/);
  return m?.[1];
}

async function readProps(
  runner: ProcessRunner,
  adbPath: string,
  serial: string,
  keys: string[],
): Promise<Record<string, string>> {
  const props: Record<string, string> = {};
  for (const key of keys) {
    const result = await runner.run(
      { command: adbPath, args: ["-s", serial, "shell", "getprop", key] },
      { timeoutMs: 10_000 },
    );
    if (result.exitCode === 0) {
      const value = result.stdout.trim();
      if (value) {
        props[key] = value;
      }
    }
  }
  return props;
}

async function readRobotControllerVersion(
  runner: ProcessRunner,
  adbPath: string,
  serial: string,
): Promise<string | undefined> {
  const result = await runner.run(
    {
      command: adbPath,
      args: [
        "-s",
        serial,
        "shell",
        "dumpsys",
        "package",
        "com.qualcomm.ftcrobotcontroller",
      ],
    },
    { timeoutMs: 20_000 },
  );
  if (result.exitCode !== 0) {
    return undefined;
  }
  const m = result.stdout.match(/versionName=([^\s]+)/);
  return m?.[1];
}

function buildStatusMessage(
  device: HubDeviceInfo | undefined,
  consoleReachable: boolean,
  consoleUrl: string,
): string {
  const parts: string[] = [];
  if (device?.serial) {
    parts.push(`Device ${device.serial} (${device.connection})`);
  }
  if (device?.osVersion) {
    parts.push(`OS ${device.osVersion}`);
  } else {
    parts.push("OS version unknown");
  }
  if (device?.robotControllerVersion) {
    parts.push(`RC app ${device.robotControllerVersion}`);
  }
  parts.push(consoleReachable ? `console reachable (${consoleUrl})` : `console unreachable (${consoleUrl})`);
  return parts.join(" · ");
}
