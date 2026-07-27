import { interpretFromUnknown } from "../errors/interpret.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_ROBOT_SUBNET_CIDR } from "./defaults.js";
import { loadWifiPreference } from "./interface-preference.js";
import { findInterfaceByNameOrIndex, listNetworkInterfaces } from "./list-interfaces.js";
import { ensureRobotRoute } from "./robot-route.js";
import type {
  AdapterControlResult,
  InterfaceMetricChange,
  NetworkInterfaceInfo,
  PreferInterfaceResult,
} from "./types.js";

/** Default metrics: internet wins general routing; robot stays secondary. */
export const DEFAULT_INTERNET_METRIC = 10;
export const DEFAULT_ROBOT_METRIC = 50;

export interface PreferInternetOptions {
  runner: ProcessRunner;
  interfaceName: string;
  robotInterfaceName?: string;
  internetMetric?: number;
  robotMetric?: number;
  platform?: NodeJS.Platform;
  preferencePath?: string;
  yes?: boolean;
  dryRun?: boolean;
  /**
   * Reserved for future gateway surgery. Phase 3 only adjusts metrics + robot subnet route.
   * Passing true currently only adds an informational plan note.
   */
  adjustGateway?: boolean;
}

export interface PreferRobotOptions {
  runner: ProcessRunner;
  interfaceName?: string;
  robotMetric?: number;
  platform?: NodeJS.Platform;
  preferencePath?: string;
  yes?: boolean;
  dryRun?: boolean;
  ensureRoute?: boolean;
}

export interface AdapterControlOptions {
  runner: ProcessRunner;
  interfaceName: string;
  action: "enable" | "disable";
  platform?: NodeJS.Platform;
  yes?: boolean;
  dryRun?: boolean;
  /** Allow disabling the last up interface. */
  force?: boolean;
}

export async function preferInternetInterface(
  options: PreferInternetOptions,
): Promise<PreferInterfaceResult> {
  const platform = options.platform ?? process.platform;
  const internetMetric = options.internetMetric ?? DEFAULT_INTERNET_METRIC;
  const robotMetric = options.robotMetric ?? DEFAULT_ROBOT_METRIC;
  const planLines: string[] = [];
  const changes: InterfaceMetricChange[] = [];

  let interfaces: NetworkInterfaceInfo[];
  try {
    interfaces = await listNetworkInterfaces({ runner: options.runner, platform });
  } catch (error) {
    return failPrefer("internet", options.interfaceName, planLines, error);
  }

  const target = findInterfaceByNameOrIndex(interfaces, options.interfaceName);
  if (!target) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      role: "internet",
      targetInterface: options.interfaceName,
      changes,
      planLines,
      message: `Internet interface not found: ${options.interfaceName}`,
      error: interpretFromUnknown(
        Object.assign(new Error(`Interface not found: ${options.interfaceName}`), {
          code: "WIFI_INTERFACE_NOT_FOUND",
        }),
      ),
    };
  }

  let robotName = options.robotInterfaceName;
  if (!robotName) {
    const { preference } = await loadWifiPreference(options.preferencePath);
    robotName = preference.robotNetworkInterface?.name;
  }

  planLines.push(
    `Set interface metric on "${target.name}" to ${internetMetric} (prefer for internet / default routes).`,
  );
  changes.push({
    name: target.name,
    index: target.index,
    previousMetric: target.metric,
    nextMetric: internetMetric,
  });

  const robot = robotName ? findInterfaceByNameOrIndex(interfaces, robotName) : undefined;
  if (robot && robot.name.toLowerCase() !== target.name.toLowerCase()) {
    planLines.push(
      `Set interface metric on robot NIC "${robot.name}" to ${robotMetric} (keep hub traffic via subnet route, not default route).`,
    );
    changes.push({
      name: robot.name,
      index: robot.index,
      previousMetric: robot.metric,
      nextMetric: robotMetric,
    });
  }

  if (options.adjustGateway) {
    planLines.push(
      "Note: --adjust-gateway is acknowledged; Phase 3 does not remove default gateways (metrics + robot subnet route only).",
    );
  }

  if (options.dryRun || !options.yes) {
    return {
      success: options.dryRun === true,
      dryRun: options.dryRun === true || !options.yes,
      role: "internet",
      targetInterface: target.name,
      changes,
      planLines,
      message: options.dryRun
        ? "Dry run: would prefer internet interface via metrics."
        : "Refusing to change interface metrics without --yes. Re-run with --dry-run to preview or --yes to apply.",
      error: options.dryRun
        ? undefined
        : interpretFromUnknown(
            Object.assign(new Error("Metric change requires --yes."), {
              code: "WIFI_METRIC_FAILED",
            }),
          ),
    };
  }

  try {
    for (const change of changes) {
      await setInterfaceMetric(options.runner, platform, change.name, change.nextMetric);
    }
    return {
      success: true,
      dryRun: false,
      role: "internet",
      targetInterface: target.name,
      changes,
      planLines,
      message: `Preferred internet interface "${target.name}" (metric ${internetMetric}).`,
    };
  } catch (error) {
    return failPrefer("internet", target.name, planLines, error, changes);
  }
}

export async function preferRobotInterface(
  options: PreferRobotOptions,
): Promise<PreferInterfaceResult> {
  const platform = options.platform ?? process.platform;
  const robotMetric = options.robotMetric ?? DEFAULT_ROBOT_METRIC;
  const planLines: string[] = [];
  const changes: InterfaceMetricChange[] = [];

  let interfaceName = options.interfaceName;
  if (!interfaceName) {
    const { preference } = await loadWifiPreference(options.preferencePath);
    interfaceName = preference.robotNetworkInterface?.name;
  }
  if (!interfaceName) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      role: "robot",
      targetInterface: "",
      changes,
      planLines,
      message: "No robot network interface selected. Pass a name or run `ftc wifi use-interface`.",
      error: interpretFromUnknown(
        Object.assign(new Error("No robot network interface selected."), {
          code: "WIFI_INTERFACE_NOT_FOUND",
        }),
      ),
    };
  }

  let interfaces: NetworkInterfaceInfo[];
  try {
    interfaces = await listNetworkInterfaces({ runner: options.runner, platform });
  } catch (error) {
    return failPrefer("robot", interfaceName, planLines, error);
  }

  const target = findInterfaceByNameOrIndex(interfaces, interfaceName);
  if (!target) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      role: "robot",
      targetInterface: interfaceName,
      changes,
      planLines,
      message: `Robot interface not found: ${interfaceName}`,
      error: interpretFromUnknown(
        Object.assign(new Error(`Interface not found: ${interfaceName}`), {
          code: "WIFI_INTERFACE_NOT_FOUND",
        }),
      ),
    };
  }

  planLines.push(
    `Ensure hub subnet route (${DEFAULT_ROBOT_SUBNET_CIDR}) via robot NIC "${target.name}".`,
  );
  planLines.push(
    `Set interface metric on "${target.name}" to ${robotMetric} (secondary to internet NIC for default routes).`,
  );
  changes.push({
    name: target.name,
    index: target.index,
    previousMetric: target.metric,
    nextMetric: robotMetric,
  });

  if (options.dryRun || !options.yes) {
    return {
      success: options.dryRun === true,
      dryRun: options.dryRun === true || !options.yes,
      role: "robot",
      targetInterface: target.name,
      changes,
      planLines,
      message: options.dryRun
        ? "Dry run: would prefer robot interface via subnet route + metric."
        : "Refusing to change robot routing preference without --yes.",
      error: options.dryRun
        ? undefined
        : interpretFromUnknown(
            Object.assign(new Error("Metric change requires --yes."), {
              code: "WIFI_METRIC_FAILED",
            }),
          ),
    };
  }

  try {
    let routeEnsured = false;
    if (options.ensureRoute !== false) {
      const route = await ensureRobotRoute({
        runner: options.runner,
        platform,
        preferencePath: options.preferencePath,
        interfaceName: target.name,
        interfaceIndex: target.index,
        yes: true,
      });
      routeEnsured = route.success;
      planLines.push(route.message);
      if (!route.success && route.error?.code === "WIFI_ROUTE_ELEVATION_REQUIRED") {
        return {
          success: false,
          dryRun: false,
          role: "robot",
          targetInterface: target.name,
          changes,
          routeEnsured,
          planLines,
          message: route.message,
          error: route.error,
        };
      }
    }

    for (const change of changes) {
      await setInterfaceMetric(options.runner, platform, change.name, change.nextMetric);
    }

    return {
      success: true,
      dryRun: false,
      role: "robot",
      targetInterface: target.name,
      changes,
      routeEnsured,
      planLines,
      message: `Preferred robot interface "${target.name}" for hub subnet (metric ${robotMetric}).`,
    };
  } catch (error) {
    return failPrefer("robot", target.name, planLines, error, changes);
  }
}

export async function setAdapterAdminState(
  options: AdapterControlOptions,
): Promise<AdapterControlResult> {
  const platform = options.platform ?? process.platform;
  const planLines: string[] = [];

  let interfaces: NetworkInterfaceInfo[];
  try {
    interfaces = await listNetworkInterfaces({ runner: options.runner, platform });
  } catch (error) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      action: options.action,
      interfaceName: options.interfaceName,
      planLines,
      message: "Failed to list interfaces.",
      error: interpretFromUnknown(error),
    };
  }

  const target = findInterfaceByNameOrIndex(interfaces, options.interfaceName);
  if (!target) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      action: options.action,
      interfaceName: options.interfaceName,
      planLines,
      message: `Interface not found: ${options.interfaceName}`,
      error: interpretFromUnknown(
        Object.assign(new Error(`Interface not found: ${options.interfaceName}`), {
          code: "WIFI_INTERFACE_NOT_FOUND",
        }),
      ),
    };
  }

  if (options.action === "disable") {
    const upCount = interfaces.filter(
      (iface) => iface.state === "up" && !isLoopbackName(iface.name),
    ).length;
    const targetUp = target.state === "up" && !isLoopbackName(target.name);
    if (targetUp && upCount <= 1 && !options.force) {
      return {
        success: false,
        dryRun: options.dryRun === true,
        action: "disable",
        interfaceName: target.name,
        planLines: [
          `Refusing to disable "${target.name}" — it appears to be the only non-loopback up interface. Pass --force to override.`,
        ],
        message: `Refusing to disable the last up interface "${target.name}" without --force.`,
        error: interpretFromUnknown(
          Object.assign(new Error("Refusing to disable last up interface."), {
            code: "WIFI_ADAPTER_LAST_UP",
          }),
        ),
      };
    }
  }

  planLines.push(
    `${options.action === "enable" ? "Enable" : "Disable"} network adapter "${target.name}".`,
  );

  if (options.dryRun || !options.yes) {
    return {
      success: options.dryRun === true,
      dryRun: options.dryRun === true || !options.yes,
      action: options.action,
      interfaceName: target.name,
      planLines,
      message: options.dryRun
        ? `Dry run: would ${options.action} adapter "${target.name}".`
        : `Refusing to ${options.action} adapter without --yes.`,
      error: options.dryRun
        ? undefined
        : interpretFromUnknown(
            Object.assign(new Error("Adapter change requires --yes."), {
              code: "WIFI_ADAPTER_FAILED",
            }),
          ),
    };
  }

  try {
    await setAdapterState(options.runner, platform, target.name, options.action);
    return {
      success: true,
      dryRun: false,
      action: options.action,
      interfaceName: target.name,
      planLines,
      message: `${options.action === "enable" ? "Enabled" : "Disabled"} adapter "${target.name}".`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun: false,
      action: options.action,
      interfaceName: target.name,
      planLines,
      message: `Failed to ${options.action} adapter "${target.name}".`,
      error: interpretFromUnknown(error),
    };
  }
}

export async function setInterfaceMetric(
  runner: ProcessRunner,
  platform: NodeJS.Platform,
  interfaceName: string,
  metric: number,
): Promise<void> {
  if (platform === "win32") {
    const result = await runner.run({
      command: "netsh",
      args: ["interface", "ipv4", "set", "interface", interfaceName, `metric=${metric}`],
    });
    if (result.exitCode !== 0) {
      const combined = `${result.stdout}\n${result.stderr}`;
      const elevation = /Access is denied|requires elevation|administrator/i.test(combined);
      throw Object.assign(new Error(combined || "netsh set interface metric failed"), {
        code: elevation ? "WIFI_ROUTE_ELEVATION_REQUIRED" : "WIFI_METRIC_FAILED",
        technicalDetails: combined,
      });
    }
    return;
  }

  // Linux/macOS: use ip/ifmetric best-effort
  if (platform === "linux") {
    const result = await runner.run({
      command: "ip",
      args: ["link", "set", "dev", interfaceName, "metric", String(metric)],
    });
    // Some kernels ignore metric on link; try ifmetric as fallback messaging
    if (result.exitCode !== 0) {
      throw Object.assign(
        new Error(result.stderr || result.stdout || "ip link set metric failed"),
        {
          code: "WIFI_METRIC_FAILED",
          technicalDetails: `${result.stdout}\n${result.stderr}`,
        },
      );
    }
    return;
  }

  // macOS lacks a simple portable metric setter; fail with guidance
  throw Object.assign(
    new Error(
      "Setting interface metrics on macOS is not automated yet. Prefer ethernet for internet and use `ftc wifi route ensure` for the hub subnet.",
    ),
    { code: "WIFI_METRIC_FAILED" },
  );
}

async function setAdapterState(
  runner: ProcessRunner,
  platform: NodeJS.Platform,
  interfaceName: string,
  action: "enable" | "disable",
): Promise<void> {
  if (platform === "win32") {
    const admin = action === "enable" ? "ENABLED" : "DISABLED";
    const result = await runner.run({
      command: "netsh",
      args: ["interface", "set", "interface", `name=${interfaceName}`, `admin=${admin}`],
    });
    if (result.exitCode !== 0) {
      const combined = `${result.stdout}\n${result.stderr}`;
      const elevation = /Access is denied|requires elevation|administrator/i.test(combined);
      throw Object.assign(new Error(combined || "netsh interface set failed"), {
        code: elevation ? "WIFI_ROUTE_ELEVATION_REQUIRED" : "WIFI_ADAPTER_FAILED",
        technicalDetails: combined,
      });
    }
    return;
  }

  if (platform === "linux") {
    const result = await runner.run({
      command: "ip",
      args: ["link", "set", "dev", interfaceName, action === "enable" ? "up" : "down"],
    });
    if (result.exitCode !== 0) {
      throw Object.assign(new Error(result.stderr || result.stdout || "ip link set failed"), {
        code: "WIFI_ADAPTER_FAILED",
        technicalDetails: `${result.stdout}\n${result.stderr}`,
      });
    }
    return;
  }

  // macOS
  const result = await runner.run({
    command: "networksetup",
    args: [
      action === "enable" ? "-setnetworkserviceenabled" : "-setnetworkserviceenabled",
      interfaceName,
      action === "enable" ? "on" : "off",
    ],
  });
  if (result.exitCode !== 0) {
    throw Object.assign(new Error(result.stderr || result.stdout || "networksetup failed"), {
      code: "WIFI_ADAPTER_FAILED",
      technicalDetails: `${result.stdout}\n${result.stderr}`,
    });
  }
}

function isLoopbackName(name: string): boolean {
  return /loopback|lo\b/i.test(name);
}

function failPrefer(
  role: "internet" | "robot",
  targetInterface: string,
  planLines: string[],
  error: unknown,
  changes: InterfaceMetricChange[] = [],
): PreferInterfaceResult {
  return {
    success: false,
    dryRun: false,
    role,
    targetInterface,
    changes,
    planLines,
    message: `Failed to prefer ${role} interface.`,
    error: interpretFromUnknown(error),
  };
}
