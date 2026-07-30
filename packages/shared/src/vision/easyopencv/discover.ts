import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../../adapters/official-ftc-project-adapter.js";
import { detectFtcDashboardDependency } from "../dashboard/detect-dependency.js";
import { extractWebcamDevicesFromXml } from "../endpoints/discover-devices.js";
import { detectEasyOpenCvDependency } from "./detect-dependency.js";
import { scanEasyOpenCvTeamCode } from "./scan.js";
import type { EasyOpenCvSourceNavigationEntry, EasyOpenCvWorkspaceDiscovery } from "./types.js";

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

function buildSourceNavigation(
  webcams: EasyOpenCvWorkspaceDiscovery["webcams"],
  pipelines: EasyOpenCvWorkspaceDiscovery["pipelines"],
): EasyOpenCvSourceNavigationEntry[] {
  const entries: EasyOpenCvSourceNavigationEntry[] = [];
  for (const pipeline of pipelines) {
    entries.push({
      label: pipeline.className,
      relativePath: pipeline.relativePath,
      kind: "pipeline",
    });
  }
  for (const webcam of webcams) {
    entries.push({
      label: webcam.className ? `${webcam.className} (webcam init)` : "Webcam initialization",
      relativePath: webcam.relativePath,
      kind: "webcam-init",
    });
  }
  return entries;
}

function resolveSelection(
  webcams: EasyOpenCvWorkspaceDiscovery["webcams"],
  pipelines: EasyOpenCvWorkspaceDiscovery["pipelines"],
  robotConfigWebcams: string[],
): { requiresSelection: boolean; selectionReasons: string[] } {
  const selectionReasons: string[] = [];
  const cameraNames = new Set(
    webcams.map((webcam) => webcam.cameraName).filter((name): name is string => Boolean(name)),
  );

  if (cameraNames.size > 1) {
    selectionReasons.push(
      `Multiple EasyOpenCV camera names detected in TeamCode: ${[...cameraNames].join(", ")}.`,
    );
  }

  if (robotConfigWebcams.length > 1 && cameraNames.size === 0) {
    selectionReasons.push(
      `Robot configuration defines ${robotConfigWebcams.length} webcams but no camera name was found in EasyOpenCV source.`,
    );
  }

  if (webcams.length > 1 && cameraNames.size <= 1) {
    selectionReasons.push(
      `EasyOpenCV webcam initialization found in ${webcams.length} TeamCode files; pick a target OpMode explicitly.`,
    );
  }

  if (pipelines.length > 1 && webcams.length > 1) {
    selectionReasons.push(
      `${pipelines.length} pipeline classes and ${webcams.length} webcam initializations detected; choose a pipeline explicitly.`,
    );
  }

  return {
    requiresSelection: selectionReasons.length > 0,
    selectionReasons,
  };
}

export async function discoverEasyOpenCvWorkspace(
  projectRoot: string,
): Promise<EasyOpenCvWorkspaceDiscovery> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const warnings: string[] = [];
  const robotConfigWebcams = await loadRobotConfigWebcams(root);
  const gradleDependency = await detectEasyOpenCvDependency(root);
  const dashboardDependency = await detectFtcDashboardDependency(root);

  const adapter = new OfficialFtcProjectAdapter();
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

  let webcams: EasyOpenCvWorkspaceDiscovery["webcams"] = [];
  let pipelines: EasyOpenCvWorkspaceDiscovery["pipelines"] = [];
  let ftcDashboardReference = false;

  if (teamCodeJavaRoot) {
    const scan = await scanEasyOpenCvTeamCode(teamCodeJavaRoot, root);
    webcams = scan.webcams;
    pipelines = scan.pipelines;
    ftcDashboardReference = scan.ftcDashboardReference;
  } else if (isOfficial) {
    warnings.push("TeamCode Java root not found; EasyOpenCV scan skipped.");
  }

  const easyOpenCvDetected =
    gradleDependency.detected || webcams.length > 0 || pipelines.length > 0;

  if (gradleDependency.detected && webcams.length === 0 && pipelines.length === 0) {
    warnings.push(
      "EasyOpenCV Gradle dependency detected but no webcam or pipeline usage found in TeamCode.",
    );
  }

  if (webcams.some((webcam) => webcam.dashboardStream) && !dashboardDependency.detected) {
    warnings.push(
      "startCameraStream referenced in TeamCode but FTC Dashboard Gradle dependency was not detected.",
    );
  }

  if (
    robotConfigWebcams.length > 0 &&
    webcams.every((webcam) => !webcam.cameraName) &&
    webcams.length > 0
  ) {
    warnings.push(
      `Robot config webcams (${robotConfigWebcams.join(", ")}) were not referenced by EasyOpenCV source scan.`,
    );
  }

  const unlikelyReplay = pipelines.filter(
    (pipeline) => pipeline.desktopReplayCompatible === "unlikely",
  );
  if (unlikelyReplay.length > 0) {
    warnings.push(
      `${unlikelyReplay.length} pipeline(s) appear Android-dependent and are unlikely to support desktop replay.`,
    );
  }

  const { requiresSelection, selectionReasons } = resolveSelection(
    webcams,
    pipelines,
    robotConfigWebcams,
  );

  return {
    projectRoot: root,
    isOfficialFtcProject: isOfficial,
    gradleDependency,
    robotConfigWebcams,
    webcams,
    pipelines,
    ftcDashboardDetected: dashboardDependency.detected || ftcDashboardReference,
    easyOpenCvDetected,
    warnings,
    requiresSelection,
    selectionReasons,
    sourceNavigation: buildSourceNavigation(webcams, pipelines),
    generatedAt,
  };
}
