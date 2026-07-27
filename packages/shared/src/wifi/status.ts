import type { DeviceProvider } from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_ROBOT_SUBNET_CIDR } from "./defaults.js";
import { loadWifiPreference } from "./interface-preference.js";
import { listNetworkInterfaces } from "./list-interfaces.js";
import { probeRobotConsole } from "./probe-console.js";
import { isRobotRoutePresent } from "./robot-route.js";
import type { FetchLike, NetworkInterfaceInfo, WifiStatusReport } from "./types.js";

export interface GetWifiStatusOptions {
  runner: ProcessRunner;
  deviceProvider?: DeviceProvider;
  fetchImpl?: FetchLike;
  consoleUrl?: string;
  preferencePath?: string;
  platform?: NodeJS.Platform;
}

export async function getWifiStatus(options: GetWifiStatusOptions): Promise<WifiStatusReport> {
  const platform = options.platform ?? process.platform;
  const consoleProbe = await probeRobotConsole({
    url: options.consoleUrl,
    fetchImpl: options.fetchImpl,
  });

  let interfaces: NetworkInterfaceInfo[] = [];
  try {
    interfaces = await listNetworkInterfaces({ runner: options.runner, platform });
  } catch {
    interfaces = [];
  }

  const { preference } = await loadWifiPreference(options.preferencePath);
  const selectedInterface = preference.robotNetworkInterface;

  let robotRoutePresent = false;
  try {
    robotRoutePresent = await isRobotRoutePresent(
      options.runner,
      DEFAULT_ROBOT_SUBNET_CIDR,
      platform,
    );
  } catch {
    robotRoutePresent = false;
  }

  const wifiAdbDevices: string[] = [];
  if (options.deviceProvider) {
    try {
      const devices = await options.deviceProvider.listDevices();
      for (const device of devices) {
        if (device.connectionType === "wifi") {
          wifiAdbDevices.push(device.serial);
        }
      }
    } catch {
      // ignore device list failures in status
    }
  }

  const parts: string[] = [];
  parts.push(
    consoleProbe.reachable
      ? "Robot Controller Console is reachable."
      : "Robot Controller Console is not reachable.",
  );
  if (selectedInterface) {
    parts.push(`Robot interface: ${selectedInterface.name}${selectedInterface.index !== undefined ? ` (#${selectedInterface.index})` : ""}.`);
  } else {
    parts.push("No robot network interface selected.");
  }
  if (wifiAdbDevices.length > 0) {
    parts.push(`Wireless adb: ${wifiAdbDevices.join(", ")}.`);
  }

  return {
    console: consoleProbe,
    interfaces,
    selectedInterface,
    robotRoutePresent,
    wifiAdbDevices,
    message: parts.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
