import { interpretFromUnknown } from "../errors/interpret.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_CONTROL_HUB_HOST, DEFAULT_ROBOT_SUBNET_CIDR, parseCidr } from "./defaults.js";
import {
  loadWifiPreference,
  recordManagedRoute,
  removeManagedRouteRecord,
} from "./interface-preference.js";
import type { RoutePlan, RouteResult } from "./types.js";

export interface EnsureRobotRouteOptions {
  runner: ProcessRunner;
  platform?: NodeJS.Platform;
  destinationCidr?: string;
  interfaceName?: string;
  interfaceIndex?: number;
  preferencePath?: string;
  yes?: boolean;
}

export interface RemoveRobotRouteOptions {
  runner: ProcessRunner;
  platform?: NodeJS.Platform;
  destinationCidr?: string;
  preferencePath?: string;
  yes?: boolean;
}

export function buildRoutePlan(options: {
  platform: NodeJS.Platform;
  destinationCidr: string;
  interfaceName?: string;
  interfaceIndex?: number;
}): RoutePlan {
  const { network, mask } = parseCidr(options.destinationCidr);
  if (options.platform === "win32") {
    const idx = options.interfaceIndex;
    const args =
      idx !== undefined
        ? ["add", network, "mask", mask, DEFAULT_CONTROL_HUB_HOST, "IF", String(idx)]
        : ["add", network, "mask", mask, DEFAULT_CONTROL_HUB_HOST];
    return {
      destination: options.destinationCidr,
      network,
      mask,
      interfaceName: options.interfaceName,
      interfaceIndex: options.interfaceIndex,
      commandDisplay: `route ${args.join(" ")}`,
    };
  }
  const dev = options.interfaceName ?? "unknown";
  return {
    destination: options.destinationCidr,
    network,
    mask,
    interfaceName: options.interfaceName,
    interfaceIndex: options.interfaceIndex,
    commandDisplay: `ip route add ${options.destinationCidr} dev ${dev}`,
  };
}

export async function ensureRobotRoute(options: EnsureRobotRouteOptions): Promise<RouteResult> {
  const platform = options.platform ?? process.platform;
  const destinationCidr = options.destinationCidr ?? DEFAULT_ROBOT_SUBNET_CIDR;

  let interfaceName = options.interfaceName;
  let interfaceIndex = options.interfaceIndex;
  if (!interfaceName && interfaceIndex === undefined) {
    const { preference } = await loadWifiPreference(options.preferencePath);
    interfaceName = preference.robotNetworkInterface?.name;
    interfaceIndex = preference.robotNetworkInterface?.index;
  }

  if (!interfaceName && interfaceIndex === undefined) {
    return {
      success: false,
      plan: buildRoutePlan({ platform, destinationCidr }),
      message: "No robot network interface selected. Run `ftc wifi use-interface` first.",
      error: interpretFromUnknown(
        Object.assign(new Error("No robot network interface selected."), {
          code: "WIFI_INTERFACE_NOT_FOUND",
        }),
      ),
    };
  }

  const plan = buildRoutePlan({
    platform,
    destinationCidr,
    interfaceName,
    interfaceIndex,
  });

  if (!options.yes) {
    return {
      success: false,
      plan,
      message: "Refusing to add robot route without --yes.",
      error: interpretFromUnknown(
        Object.assign(new Error("Route change requires --yes."), {
          code: "WIFI_ROUTE_FAILED",
        }),
      ),
    };
  }

  const result = await applyRouteAdd(platform, options.runner, plan);
  if (result.success) {
    await recordManagedRoute(
      {
        destination: destinationCidr,
        interfaceName,
        interfaceIndex,
        addedAt: new Date().toISOString(),
      },
      options.preferencePath,
    );
  }
  return result;
}

export async function removeRobotRoute(options: RemoveRobotRouteOptions): Promise<RouteResult> {
  const platform = options.platform ?? process.platform;
  const destinationCidr = options.destinationCidr ?? DEFAULT_ROBOT_SUBNET_CIDR;
  const { network, mask } = parseCidr(destinationCidr);
  const plan: RoutePlan = {
    destination: destinationCidr,
    network,
    mask,
    commandDisplay:
      platform === "win32" ? `route delete ${network}` : `ip route del ${destinationCidr}`,
  };

  if (!options.yes) {
    return {
      success: false,
      plan,
      message: "Refusing to remove robot route without --yes.",
      error: interpretFromUnknown(
        Object.assign(new Error("Route removal requires --yes."), {
          code: "WIFI_ROUTE_FAILED",
        }),
      ),
    };
  }

  let result: RouteResult;
  if (platform === "win32") {
    const cmd = await options.runner.run({
      command: "route",
      args: ["delete", network],
    });
    result = mapRouteResult(cmd, plan, "Removed robot subnet route.");
  } else {
    const cmd = await options.runner.run({
      command: "ip",
      args: ["route", "del", destinationCidr],
    });
    result = mapRouteResult(cmd, plan, "Removed robot subnet route.");
  }

  if (result.success) {
    await removeManagedRouteRecord(destinationCidr, options.preferencePath);
  }
  return result;
}

async function applyRouteAdd(
  platform: NodeJS.Platform,
  runner: ProcessRunner,
  plan: RoutePlan,
): Promise<RouteResult> {
  if (platform === "win32") {
    const args =
      plan.interfaceIndex !== undefined
        ? [
            "add",
            plan.network,
            "mask",
            plan.mask,
            DEFAULT_CONTROL_HUB_HOST,
            "IF",
            String(plan.interfaceIndex),
          ]
        : ["add", plan.network, "mask", plan.mask, DEFAULT_CONTROL_HUB_HOST];
    const result = await runner.run({ command: "route", args });
    if (/already exists|The route addition failed/i.test(`${result.stdout}\n${result.stderr}`)) {
      if (/already exists/i.test(`${result.stdout}\n${result.stderr}`)) {
        return {
          success: true,
          plan,
          alreadyPresent: true,
          message: "Robot subnet route already present.",
        };
      }
    }
    return mapRouteResult(result, plan, "Added robot subnet route.");
  }

  if (!plan.interfaceName) {
    return {
      success: false,
      plan,
      message: "Interface name required for route on this platform.",
      error: interpretFromUnknown(
        Object.assign(new Error("Interface name required."), { code: "WIFI_INTERFACE_NOT_FOUND" }),
      ),
    };
  }

  const result = await runner.run({
    command: "ip",
    args: ["route", "add", plan.destination, "dev", plan.interfaceName],
  });
  if (/File exists|RTNETLINK answers: File exists/i.test(`${result.stdout}\n${result.stderr}`)) {
    return {
      success: true,
      plan,
      alreadyPresent: true,
      message: "Robot subnet route already present.",
    };
  }
  return mapRouteResult(result, plan, "Added robot subnet route.");
}

function mapRouteResult(
  result: { exitCode: number | null; stdout: string; stderr: string },
  plan: RoutePlan,
  successMessage: string,
): RouteResult {
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  if (result.exitCode === 0) {
    return { success: true, plan, message: successMessage };
  }
  const elevation =
    /Access is denied|requires elevation|operation requires administrator|permission denied/i.test(
      combined,
    );
  const code = elevation ? "WIFI_ROUTE_ELEVATION_REQUIRED" : "WIFI_ROUTE_FAILED";
  return {
    success: false,
    plan,
    message: elevation
      ? "Adding the robot route requires an elevated shell (Run as Administrator)."
      : "Failed to modify robot subnet route.",
    error: interpretFromUnknown(
      Object.assign(new Error(combined || "route command failed"), {
        code,
        technicalDetails: combined,
      }),
    ),
  };
}

export async function isRobotRoutePresent(
  runner: ProcessRunner,
  destinationCidr: string = DEFAULT_ROBOT_SUBNET_CIDR,
  platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
  const { network } = parseCidr(destinationCidr);
  if (platform === "win32") {
    const result = await runner.run({ command: "route", args: ["print", network] });
    return result.exitCode === 0 && result.stdout.includes(network);
  }
  const result = await runner.run({ command: "ip", args: ["route", "show", destinationCidr] });
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}
