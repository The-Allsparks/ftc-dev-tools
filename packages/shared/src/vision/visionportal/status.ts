import { VISION_PORTAL_CAPABILITIES } from "./capabilities.js";
import { discoverVisionPortalWorkspace } from "./discover.js";
import type { VisionPortalStatusReport } from "./types.js";

export async function getVisionPortalStatus(
  projectRoot: string,
): Promise<VisionPortalStatusReport> {
  const generatedAt = new Date().toISOString();
  const discovery = await discoverVisionPortalWorkspace(projectRoot);
  const humanSummary: string[] = [];

  if (!discovery.isOfficialFtcProject) {
    humanSummary.push("Project layout: not an official FTC project");
  } else {
    humanSummary.push("Project layout: official FTC project");
  }

  if (discovery.robotConfigWebcams.length > 0) {
    humanSummary.push(`Robot config webcams: ${discovery.robotConfigWebcams.join(", ")}`);
  } else {
    humanSummary.push("Robot config webcams: none detected");
  }

  if (discovery.configs.length === 0) {
    humanSummary.push("VisionPortal TeamCode scan: no configurations found");
  } else {
    humanSummary.push(`VisionPortal TeamCode scan: ${discovery.configs.length} configuration(s)`);
    for (const config of discovery.configs) {
      const parts = [config.relativePath];
      if (config.cameraName) {
        parts.push(`camera=${config.cameraName}`);
      }
      if (config.resolution) {
        parts.push(`${config.resolution.width}x${config.resolution.height}`);
      }
      if (config.streamFormat) {
        parts.push(`stream=${config.streamFormat}`);
      }
      if (config.processors.length > 0) {
        parts.push(`processors=${config.processors.map((processor) => processor.kind).join(",")}`);
      }
      humanSummary.push(`  ${parts.join(" | ")}`);
    }
  }

  let message: string;
  if (!discovery.isOfficialFtcProject) {
    message = "Not an official FTC project; VisionPortal status is limited.";
  } else if (!discovery.visionPortalImportDetected) {
    message = "VisionPortal was not detected in TeamCode.";
  } else if (discovery.requiresSelection) {
    message = discovery.selectionReasons[0] ?? "Multiple VisionPortal targets require selection.";
  } else {
    message = "VisionPortal configuration detected in TeamCode.";
  }

  return {
    projectRoot: discovery.projectRoot,
    discovery,
    capabilities: { ...VISION_PORTAL_CAPABILITIES },
    message,
    humanSummary,
    generatedAt,
  };
}
