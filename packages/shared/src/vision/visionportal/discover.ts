import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectAdapter } from "../../adapters/resolve-project-adapter.js";
import { extractWebcamDevicesFromXml } from "../endpoints/discover-devices.js";
import type { ProjectAdapter } from "../../types/project.js";
import { scanVisionPortalTeamCode } from "./scan.js";
import type { VisionPortalWorkspaceDiscovery } from "./types.js";

async function loadRobotConfigWebcams(projectRoot: string): Promise<string[]> {
  const xmlDir = path.join(projectRoot, "TeamCode", "src", "main", "res", "xml");
  let entries: string[];
  try {
    entries = await fs.readdir(xmlDir);
  } catch {
    return [];
  }

  const webcams = new Set<string>();
  for (const entry of entries) {
    if (!entry.endsWith(".xml")) {
      continue;
    }
    try {
      const xml = await fs.readFile(path.join(xmlDir, entry), "utf8");
      for (const name of extractWebcamDevicesFromXml(xml)) {
        webcams.add(name);
      }
    } catch {
      continue;
    }
  }
  return [...webcams].sort();
}

function resolveSelection(
  configs: VisionPortalWorkspaceDiscovery["configs"],
  robotConfigWebcams: string[],
): { requiresSelection: boolean; selectionReasons: string[] } {
  const selectionReasons: string[] = [];
  const cameraNames = new Set(
    configs.map((config) => config.cameraName).filter((name): name is string => Boolean(name)),
  );

  if (cameraNames.size > 1) {
    selectionReasons.push(
      `Multiple VisionPortal camera names detected in TeamCode: ${[...cameraNames].join(", ")}.`,
    );
  }

  if (robotConfigWebcams.length > 1 && cameraNames.size === 0) {
    selectionReasons.push(
      `Robot configuration defines ${robotConfigWebcams.length} webcams but no camera name was found in VisionPortal source.`,
    );
  }

  if (robotConfigWebcams.length > 1 && cameraNames.size === 1) {
    const configured = [...cameraNames][0]!;
    if (!robotConfigWebcams.includes(configured)) {
      selectionReasons.push(
        `Configured camera "${configured}" does not match robot config webcams: ${robotConfigWebcams.join(", ")}.`,
      );
    }
  }

  if (configs.length > 1 && cameraNames.size <= 1) {
    selectionReasons.push(
      `VisionPortal initialization found in ${configs.length} TeamCode files; pick a target OpMode explicitly.`,
    );
  }

  return {
    requiresSelection: selectionReasons.length > 0,
    selectionReasons,
  };
}

export async function discoverVisionPortalWorkspace(
  projectRoot: string,
  options?: { adapter?: ProjectAdapter },
): Promise<VisionPortalWorkspaceDiscovery> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const warnings: string[] = [];
  const robotConfigWebcams = await loadRobotConfigWebcams(root);

  const adapter = resolveProjectAdapter(options?.adapter);
  let isOfficial = false;
  let teamCodeJavaRoot: string | undefined;

  try {
    const info = await adapter.inspect(root);
    isOfficial = info.kind !== "unknown" && Boolean(info.teamCodeSourcePath);
    if (info.teamCodeSourcePath) {
      teamCodeJavaRoot = info.teamCodeSourcePath;
    }
  } catch {
    warnings.push("Could not inspect project layout.");
  }

  let configs: VisionPortalWorkspaceDiscovery["configs"] = [];
  let visionPortalImportDetected = false;

  if (teamCodeJavaRoot) {
    configs = await scanVisionPortalTeamCode(teamCodeJavaRoot, root);
    visionPortalImportDetected = configs.length > 0;
  } else if (isOfficial) {
    warnings.push("TeamCode Java root not found; VisionPortal scan skipped.");
  }

  if (robotConfigWebcams.length > 0 && configs.every((config) => !config.cameraName)) {
    warnings.push(
      `Robot config webcams (${robotConfigWebcams.join(", ")}) were not referenced by VisionPortal source scan.`,
    );
  }

  const { requiresSelection, selectionReasons } = resolveSelection(configs, robotConfigWebcams);

  return {
    projectRoot: root,
    isOfficialFtcProject: isOfficial,
    robotConfigWebcams,
    configs,
    visionPortalImportDetected,
    warnings,
    requiresSelection,
    selectionReasons,
    generatedAt,
  };
}
