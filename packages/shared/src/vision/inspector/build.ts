import { getLimelightResults } from "../limelight/results.js";
import { getLimelightStatus } from "../limelight/status.js";
import { resolveLimelightHostReport } from "../limelight/resolve-host.js";
import { discoverVisionWorkspace } from "../discover.js";
import { visionConfigFromProjectConfig } from "../status.js";
import { loadProjectConfig } from "../../config/load.js";
import { buildLimelightInspectorSnapshot, emptyInspectorSnapshot } from "./limelight.js";
import type { BuildVisionInspectorOptions, VisionInspectorSnapshot } from "./types.js";

async function isLimelightRelevant(projectRoot: string): Promise<boolean> {
  const discovery = await discoverVisionWorkspace(projectRoot);
  if (discovery.signals.some((signal) => signal.kind === "limelight")) {
    return true;
  }
  const configResult = await loadProjectConfig(projectRoot);
  const vision = visionConfigFromProjectConfig(configResult.config.vision);
  return (
    vision.enabledProviderIds?.includes("vision:limelight") ||
    Boolean(vision.limelight?.host) ||
    vision.defaultProviderId === "vision:limelight"
  );
}

export async function buildVisionInspectorSnapshot(
  options: BuildVisionInspectorOptions,
): Promise<VisionInspectorSnapshot | undefined> {
  const projectRoot = options.projectRoot;
  const relevant = await isLimelightRelevant(projectRoot);
  if (!relevant) {
    return undefined;
  }

  const hostReport = await resolveLimelightHostReport(projectRoot, {
    explicitHost: options.explicitLimelightHost,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });

  if (hostReport.requiresSelection || !hostReport.host) {
    return emptyInspectorSnapshot({
      providerId: "vision:limelight",
      providerLabel: "Limelight",
      message: hostReport.message,
      requiresSelection: true,
    });
  }

  try {
    const [results, status] = await Promise.all([
      getLimelightResults(projectRoot, {
        host: hostReport.host,
        deviceProvider: options.deviceProvider,
        runner: options.runner,
      }),
      getLimelightStatus(projectRoot, {
        host: hostReport.host,
        deviceProvider: options.deviceProvider,
        runner: options.runner,
      }).catch(() => undefined),
    ]);

    return buildLimelightInspectorSnapshot({ results, status });
  } catch (error) {
    return emptyInspectorSnapshot({
      providerId: "vision:limelight",
      providerLabel: "Limelight",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
