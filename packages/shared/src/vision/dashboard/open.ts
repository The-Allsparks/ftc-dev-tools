import path from "node:path";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import { buildConsoleOpenCommand } from "../../wifi/open-console.js";
import { resolveDashboardUrl } from "./resolve-url.js";
import type { OpenFtcDashboardResult } from "./types.js";

export interface OpenFtcDashboardOptions {
  url?: string;
  host?: string;
  deviceProvider?: DeviceProvider;
  runner: ProcessRunner;
  probeNetwork?: boolean;
  platform?: NodeJS.Platform;
}

export async function openFtcDashboard(
  projectRoot: string,
  options: OpenFtcDashboardOptions,
): Promise<OpenFtcDashboardResult> {
  const root = path.resolve(projectRoot);
  const resolved = await resolveDashboardUrl(root, {
    explicitUrl: options.url,
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });

  const spec = buildConsoleOpenCommand(resolved.url, options.platform ?? process.platform);
  const result = await options.runner.run(spec);
  if (result.exitCode !== 0) {
    return {
      url: resolved.url,
      opened: false,
      message: `Could not open browser automatically. Open ${resolved.url} manually.`,
    };
  }

  return {
    url: resolved.url,
    opened: true,
    message: `Opened FTC Dashboard: ${resolved.url}`,
  };
}
