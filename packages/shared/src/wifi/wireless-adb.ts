import { interpretFromUnknown } from "../errors/interpret.js";
import { discoverAdb } from "../discovery/adb-discovery.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_CONTROL_HUB_ADB_PORT, parseHostPort } from "./defaults.js";
import { loadWifiPreference } from "./interface-preference.js";
import { ensureRobotRoute } from "./robot-route.js";
import type { WifiConnectResult } from "./types.js";

export interface ConnectWifiAdbOptions {
  runner: ProcessRunner;
  endpoint?: string;
  yes?: boolean;
  ensureRoute?: boolean;
  preferencePath?: string;
  platform?: NodeJS.Platform;
}

export interface DisconnectWifiAdbOptions {
  runner: ProcessRunner;
  endpoint?: string;
  disconnectAll?: boolean;
}

export interface EnableTcpipOptions {
  runner: ProcessRunner;
  deviceSerial?: string;
  port?: number;
  yes?: boolean;
}

export async function connectWifiAdb(options: ConnectWifiAdbOptions): Promise<WifiConnectResult> {
  const { host, port, endpoint } = parseHostPort(options.endpoint);
  void host;
  void port;

  let routeResult;
  if (options.ensureRoute !== false) {
    const { preference } = await loadWifiPreference(options.preferencePath);
    if (preference.robotNetworkInterface) {
      routeResult = await ensureRobotRoute({
        runner: options.runner,
        platform: options.platform,
        preferencePath: options.preferencePath,
        interfaceName: preference.robotNetworkInterface.name,
        interfaceIndex: preference.robotNetworkInterface.index,
        yes: options.yes ?? true,
      });
      if (
        !routeResult.success &&
        routeResult.error?.code !== "WIFI_ROUTE_FAILED" &&
        routeResult.error?.code !== "WIFI_ROUTE_ELEVATION_REQUIRED"
      ) {
        return {
          success: false,
          endpoint,
          message: routeResult.message,
          routeResult,
          error: routeResult.error,
        };
      }
      if (
        !routeResult.success &&
        (routeResult.error?.code === "WIFI_ROUTE_ELEVATION_REQUIRED" ||
          (routeResult.error?.code === "WIFI_ROUTE_FAILED" && !options.yes))
      ) {
        return {
          success: false,
          endpoint,
          message: routeResult.message,
          routeResult,
          error: routeResult.error,
        };
      }
    }
  }

  const adb = await discoverAdb(options.runner);
  if (!adb.found || !adb.adbPath) {
    return {
      success: false,
      endpoint,
      message: "adb not found.",
      routeResult,
      error: interpretFromUnknown(Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" })),
    };
  }

  const result = await options.runner.run(
    {
      command: adb.adbPath,
      args: ["connect", endpoint],
    },
    { timeoutMs: 30_000 },
  );

  const combined = `${result.stdout}\n${result.stderr}`.trim();
  const connected =
    /connected to|already connected/i.test(combined) && !/cannot connect|failed to connect/i.test(combined);

  if (!connected) {
    return {
      success: false,
      endpoint,
      message: `Failed to connect wireless adb to ${endpoint}.`,
      routeResult,
      error: interpretFromUnknown(
        Object.assign(new Error(combined || "adb connect failed"), {
          code: "WIFI_ADB_CONNECT_FAILED",
          technicalDetails: combined,
        }),
      ),
    };
  }

  return {
    success: true,
    endpoint,
    message: `Wireless adb connected to ${endpoint}. Run \`ftc devices\` to verify.`,
    routeResult,
  };
}

export async function disconnectWifiAdb(
  options: DisconnectWifiAdbOptions,
): Promise<{ success: boolean; message: string }> {
  const adb = await discoverAdb(options.runner);
  if (!adb.found || !adb.adbPath) {
    throw Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" });
  }

  const args =
    options.disconnectAll || !options.endpoint
      ? ["disconnect"]
      : ["disconnect", parseHostPort(options.endpoint).endpoint];

  const result = await options.runner.run({
    command: adb.adbPath,
    args,
  });
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  if (result.exitCode !== 0 && combined) {
    return {
      success: false,
      message: combined,
    };
  }
  return {
    success: true,
    message: options.endpoint
      ? `Disconnected wireless adb from ${parseHostPort(options.endpoint).endpoint}.`
      : "Disconnected all wireless adb endpoints.",
  };
}

export async function enableTcpip(options: EnableTcpipOptions): Promise<{ success: boolean; message: string }> {
  if (!options.yes) {
    return {
      success: false,
      message: "Refusing to enable tcpip without --yes.",
    };
  }

  const adb = await discoverAdb(options.runner);
  if (!adb.found || !adb.adbPath) {
    throw Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" });
  }

  const serial = options.deviceSerial;
  if (!serial) {
    throw Object.assign(new Error("USB device serial required. Use --device <serial>."), {
      code: "WIFI_NO_USB_DEVICE",
    });
  }

  const port = options.port ?? DEFAULT_CONTROL_HUB_ADB_PORT;
  const result = await options.runner.run({
    command: adb.adbPath,
    args: ["-s", serial, "tcpip", String(port)],
  });
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: combined || "adb tcpip failed.",
    };
  }
  return {
    success: true,
    message: `Device ${serial} listening for wireless adb on port ${port}.`,
  };
}
