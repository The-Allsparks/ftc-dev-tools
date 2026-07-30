import path from "node:path";
import { loadProjectConfig } from "../config/load.js";
import { discoverVisionWorkspace } from "./discover.js";
import type { FtcDevVisionConfig, VisionStatusReport } from "./types.js";

export function defaultVisionConfig(): FtcDevVisionConfig {
  return {
    enabledProviderIds: [],
  };
}

export function visionConfigFromProjectConfig(
  vision: FtcDevVisionConfig | undefined,
): FtcDevVisionConfig {
  return {
    ...defaultVisionConfig(),
    ...vision,
    limelight: vision?.limelight ? { ...vision.limelight } : undefined,
    enabledProviderIds: vision?.enabledProviderIds ? [...vision.enabledProviderIds] : [],
  };
}

export async function getVisionStatus(projectRoot: string): Promise<VisionStatusReport> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const configResult = await loadProjectConfig(root);
  const config = visionConfigFromProjectConfig(configResult.config.vision);
  const discovery = await discoverVisionWorkspace(root);

  let message: string;
  if (!discovery.isOfficialFtcProject) {
    message = "Not an official FTC project; vision discovery skipped.";
  } else if (discovery.signals.length === 0) {
    message = "No vision libraries detected in TeamCode or Gradle dependencies yet.";
  } else {
    const kinds = discovery.signals.map((signal) => signal.kind).join(", ");
    message = `Detected vision-related signals: ${kinds}.`;
  }

  if (config.defaultProviderId && discovery.suggestedDefaultProviderId) {
    if (config.defaultProviderId !== discovery.suggestedDefaultProviderId) {
      discovery.warnings.push(
        `Configured defaultProviderId "${config.defaultProviderId}" differs from discovery suggestion "${discovery.suggestedDefaultProviderId}".`,
      );
    }
  }

  return {
    projectRoot: root,
    config,
    configPath: configResult.path,
    configWarnings: configResult.warnings,
    configErrors: configResult.errors,
    discovery,
    message,
    generatedAt,
  };
}
