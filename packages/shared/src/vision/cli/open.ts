import path from "node:path";
import { buildConsoleOpenCommand } from "../../wifi/open-console.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import { discoverVisionDevices } from "../endpoints/discover-devices.js";
import { DEFAULT_LIMELIGHT_WEB_PORT } from "../limelight/constants.js";
import { resolveLimelightHost } from "../limelight/resolve-host.js";
import { openFtcDashboard } from "../dashboard/open.js";
import { getVisionStatus } from "../status.js";
import type { OpenVisionTargetResult, VisionCliCommonOptions } from "./types.js";

export interface OpenVisionTargetOptions extends VisionCliCommonOptions {
  deviceProvider?: DeviceProvider;
  runner: ProcessRunner;
  platform?: NodeJS.Platform;
}

async function resolveEndpointUrl(
  projectRoot: string,
  endpointId: string,
  options: OpenVisionTargetOptions,
): Promise<{ url: string; providerId: string } | undefined> {
  const report = await discoverVisionDevices(projectRoot, {
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    platform: options.platform,
    probeNetwork: options.probeNetwork ?? true,
    timeoutMs: options.timeoutMs,
  });
  const match = report.endpoints.find((endpoint) => endpoint.id === endpointId);
  if (!match?.url && !match?.host) {
    return undefined;
  }
  const url =
    match.url ??
    (match.host
      ? `http://${match.host}:${match.port ?? (match.kind.startsWith("limelight") ? DEFAULT_LIMELIGHT_WEB_PORT : 8080)}`
      : undefined);
  if (!url) {
    return undefined;
  }
  return { url, providerId: match.providerId };
}

function inferProvider(
  explicit: OpenVisionTargetOptions["provider"],
  suggested?: string,
): "vision:limelight" | "telemetry:ftc-dashboard" {
  if (explicit === "vision:limelight" || explicit === "limelight") {
    return "vision:limelight";
  }
  if (explicit === "telemetry:ftc-dashboard" || explicit === "ftc-dashboard") {
    return "telemetry:ftc-dashboard";
  }
  if (suggested?.includes("limelight")) {
    return "vision:limelight";
  }
  return "telemetry:ftc-dashboard";
}

export async function openVisionTarget(
  projectRoot: string,
  options: OpenVisionTargetOptions,
): Promise<OpenVisionTargetResult> {
  const root = path.resolve(projectRoot);

  if (options.endpoint) {
    const resolved = await resolveEndpointUrl(root, options.endpoint, options);
    if (!resolved) {
      throw Object.assign(new Error(`Vision endpoint "${options.endpoint}" was not found.`), {
        code: "VISION_SELECTION_REQUIRED",
      });
    }
    const spec = buildConsoleOpenCommand(resolved.url, options.platform ?? process.platform);
    const result = await options.runner.run(spec);
    return {
      providerId: resolved.providerId,
      url: resolved.url,
      opened: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? `Opened ${resolved.url}`
          : `Could not open browser automatically. Open ${resolved.url} manually.`,
    };
  }

  const status = await getVisionStatus(root);
  const provider = inferProvider(
    options.provider,
    status.config.defaultProviderId ?? status.discovery.suggestedDefaultProviderId,
  );

  if (provider === "telemetry:ftc-dashboard") {
    const dashboard = await openFtcDashboard(root, {
      url: options.url,
      host: options.host,
      deviceProvider: options.deviceProvider,
      runner: options.runner,
      platform: options.platform,
      probeNetwork: options.probeNetwork,
    });
    return {
      providerId: "telemetry:ftc-dashboard",
      url: dashboard.url,
      opened: dashboard.opened,
      message: dashboard.message,
    };
  }

  const limelight = await resolveLimelightHost(root, {
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });
  const url = `http://${limelight.host}:${DEFAULT_LIMELIGHT_WEB_PORT}`;
  const spec = buildConsoleOpenCommand(url, options.platform ?? process.platform);
  const result = await options.runner.run(spec);
  return {
    providerId: "vision:limelight",
    url,
    opened: result.exitCode === 0,
    message:
      result.exitCode === 0
        ? `Opened Limelight Vision web UI: ${url}`
        : `Could not open browser automatically. Open ${url} manually.`,
  };
}
