import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../../adapters/official-ftc-project-adapter.js";
import { extractWebcamDevicesFromXml } from "../endpoints/discover-devices.js";
import { detectFtcDashboardDependency } from "../dashboard/detect-dependency.js";
import { listRobotConfigs } from "../../robot-config/list.js";
import { DEFAULT_VISION_CODEGEN_PACKAGE, VISION_CODEGEN_LANGUAGE } from "./constants.js";
import type { VisionCodegenKindDescriptor } from "./types.js";

export interface VisionCodegenContext {
  language: typeof VISION_CODEGEN_LANGUAGE;
  packageName: string;
  teamCodeSourcePath?: string;
  webcamNames: string[];
  robotConfigName?: string;
  cameraName?: string;
  requiresCameraSelection: boolean;
  cameraSelectionMessage?: string;
  ftcDashboardDetected: boolean;
}

export interface ResolveVisionCodegenContextOptions {
  projectRoot: string;
  packageName?: string;
  cameraName?: string;
  configName?: string;
}

async function loadRobotConfigWebcams(
  projectRoot: string,
): Promise<{ names: string[]; configName?: string }> {
  const listed = await listRobotConfigs(projectRoot);
  const configs = listed.configs;
  if (configs.length === 0) {
    return { names: [] };
  }

  const webcams = new Set<string>();
  let configName: string | undefined;

  for (const config of configs) {
    try {
      const xml = await fs.readFile(config.absolutePath, "utf8");
      const names = extractWebcamDevicesFromXml(xml);
      if (names.length > 0) {
        configName = config.name;
        for (const name of names) {
          webcams.add(name);
        }
      }
    } catch {
      continue;
    }
  }

  return { names: [...webcams].sort(), configName };
}

export async function resolveVisionCodegenContext(
  options: ResolveVisionCodegenContextOptions,
): Promise<VisionCodegenContext> {
  const projectRoot = path.resolve(options.projectRoot);
  const packageName = (options.packageName ?? DEFAULT_VISION_CODEGEN_PACKAGE).trim();
  const adapter = new OfficialFtcProjectAdapter();
  const info = await adapter.inspect(projectRoot);

  const { names: webcamNames, configName: discoveredConfig } =
    await loadRobotConfigWebcams(projectRoot);
  const dashboard = await detectFtcDashboardDependency(projectRoot);

  let cameraName = options.cameraName?.trim();
  let requiresCameraSelection = false;
  let cameraSelectionMessage: string | undefined;

  if (cameraName) {
    if (webcamNames.length > 0 && !webcamNames.includes(cameraName)) {
      requiresCameraSelection = true;
      cameraSelectionMessage = `Camera "${cameraName}" not found in robot configuration (${webcamNames.join(", ")}).`;
    }
  } else if (webcamNames.length === 1) {
    cameraName = webcamNames[0];
  } else if (webcamNames.length > 1) {
    requiresCameraSelection = true;
    cameraSelectionMessage = `Multiple webcams in robot configuration: ${webcamNames.join(", ")}. Pass --camera to select one.`;
  } else {
    cameraName = "Webcam 1";
  }

  return {
    language: VISION_CODEGEN_LANGUAGE,
    packageName,
    teamCodeSourcePath: info.teamCodeSourcePath,
    webcamNames,
    robotConfigName: options.configName ?? discoveredConfig,
    cameraName,
    requiresCameraSelection,
    cameraSelectionMessage,
    ftcDashboardDetected: dashboard.detected,
  };
}

export const VISION_CODEGEN_KINDS: VisionCodegenKindDescriptor[] = [
  {
    kind: "easyopencv",
    label: "EasyOpenCV",
    description: "Pipeline class + LinearOpMode with webcam init and optional Dashboard stream.",
    generatesOpMode: true,
  },
  {
    kind: "visionportal-apriltag",
    label: "VisionPortal AprilTag",
    description: "LinearOpMode with AprilTagProcessor and safe VisionPortal cleanup.",
    generatesOpMode: true,
  },
  {
    kind: "visionportal-color",
    label: "VisionPortal color",
    description: "LinearOpMode with ColorProcessor and safe VisionPortal cleanup.",
    generatesOpMode: true,
  },
  {
    kind: "limelight",
    label: "Limelight",
    description: "TeleOp with NetworkTables init, result loop, and pipeline switching.",
    generatesOpMode: true,
  },
  {
    kind: "dashboard-stream",
    label: "FTC Dashboard stream",
    description: "TeleOp that starts an FTC Dashboard camera stream for a configured webcam.",
    generatesOpMode: true,
  },
];
