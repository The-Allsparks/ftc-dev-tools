import type { AndroidDevice, DeviceProvider, LogEntry, LogOptions } from "../types/device.js";
import { parseLogcatLine } from "../logcat/parse.js";

export type MockScenario =
  | "none"
  | "one"
  | "unauthorized"
  | "offline"
  | "multiple"
  | "install-success"
  | "install-fail"
  | "disconnect-during-deploy";

export interface MockDeviceProviderOptions {
  scenario?: MockScenario;
  devices?: AndroidDevice[];
  logLines?: string[];
}

export class MockDeviceProvider implements DeviceProvider {
  private scenario: MockScenario;
  private devices: AndroidDevice[];
  private readonly logLines: string[];
  private disconnected = false;

  constructor(options: MockDeviceProviderOptions = {}) {
    this.scenario = options.scenario ?? "one";
    this.devices = options.devices ?? devicesForScenario(this.scenario);
    this.logLines = options.logLines ?? [
      "01-01 12:00:00.000  1234  1234 I TeamCode: Hello from mock",
      "01-01 12:00:01.000  1234  1234 E AndroidRuntime: Fatal exception",
    ];
  }

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
    this.devices = devicesForScenario(scenario);
    this.disconnected = false;
  }

  async listDevices(): Promise<AndroidDevice[]> {
    if (this.disconnected) {
      return [];
    }
    return this.devices.map((device) => ({ ...device }));
  }

  async installApk(device: AndroidDevice, apkPath: string): Promise<void> {
    void apkPath;
    if (this.scenario === "disconnect-during-deploy") {
      this.disconnected = true;
      throw Object.assign(new Error("device offline"), { code: "DEVICE_OFFLINE" });
    }
    if (this.scenario === "install-fail") {
      throw Object.assign(new Error("App installation failed."), {
        code: "INSTALL_FAILED",
        technicalDetails: "Failure [INSTALL_FAILED_INVALID_APK]",
      });
    }
    if (device.state === "unauthorized") {
      throw Object.assign(new Error("device unauthorized"), { code: "DEVICE_UNAUTHORIZED" });
    }
    if (device.state === "offline") {
      throw Object.assign(new Error("device offline"), { code: "DEVICE_OFFLINE" });
    }
    // install-success and default succeed
  }

  async launchApp(device: AndroidDevice, applicationId: string): Promise<void> {
    void device;
    void applicationId;
    if (this.disconnected) {
      throw Object.assign(new Error("device offline"), { code: "DEVICE_OFFLINE" });
    }
  }

  async *streamLogs(device: AndroidDevice, options?: LogOptions): AsyncIterable<LogEntry> {
    void device;
    for (const line of this.logLines) {
      if (options?.signal?.aborted) {
        return;
      }
      const entry = parseLogcatLine(line);
      if (!options?.filter || options.filter === "all" || options.filter === "raw") {
        yield entry;
        continue;
      }
      if (options.filter === "errors" && /E|F/i.test(entry.level)) {
        yield entry;
      }
      if (
        options.filter === "teamcode" &&
        /teamcode|opmode/i.test(`${entry.tag} ${entry.message}`)
      ) {
        yield entry;
      }
    }
  }
}

function devicesForScenario(scenario: MockScenario): AndroidDevice[] {
  const hub: AndroidDevice = {
    serial: "REVCONTROLHUB001",
    state: "device",
    authorization: "authorized",
    model: "Control Hub",
    manufacturer: "REV Robotics",
    product: "controlhub",
    connectionType: "usb",
    controlHubLikelihood: "probable",
    rawProperties: { model: "Control_Hub" },
  };

  switch (scenario) {
    case "none":
      return [];
    case "one":
    case "install-success":
    case "install-fail":
    case "disconnect-during-deploy":
      return [hub];
    case "unauthorized":
      return [
        {
          ...hub,
          serial: "UNAUTHORIZED001",
          state: "unauthorized",
          authorization: "unauthorized",
        },
      ];
    case "offline":
      return [
        {
          ...hub,
          serial: "OFFLINE001",
          state: "offline",
          authorization: "unknown",
        },
      ];
    case "multiple":
      return [
        hub,
        {
          serial: "emulator-5554",
          state: "device",
          authorization: "authorized",
          model: "sdk_gphone64_x86_64",
          manufacturer: "Google",
          product: "emulator",
          connectionType: "usb",
          controlHubLikelihood: "unlikely",
          rawProperties: {},
        },
      ];
    default:
      return [hub];
  }
}
