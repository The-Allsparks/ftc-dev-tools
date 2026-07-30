import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../../adapters/official-ftc-project-adapter.js";
import { DEFAULT_OPMODE_PACKAGE, packageToRelativePath } from "../../opmode/defaults.js";
import { discoverVisionWorkspace } from "../discover.js";
import { discoverVisionPortalWorkspace } from "../visionportal/discover.js";
import { detectFtcDashboardDependency } from "../dashboard/detect-dependency.js";
import {
  VISION_BRIDGE_CLASS_NAMES,
  VISION_BRIDGE_CODE_VERSION,
  VISION_BRIDGE_PACKAGE_SUFFIX,
  VISION_BRIDGE_TRANSPORT_PRIORITY,
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
  type VisionBridgeTransport,
} from "./constants.js";
import type { VisionBridgeFileStatus, VisionBridgeStatusReport } from "./types.js";

function defaultBridgePackage(): string {
  return `${DEFAULT_OPMODE_PACKAGE}.${VISION_BRIDGE_PACKAGE_SUFFIX}`;
}

function bridgeRelativePath(packageName: string, className: string): string {
  return path
    .join(
      "TeamCode",
      "src",
      "main",
      "java",
      packageToRelativePath(packageName),
      `${className}.java`,
    )
    .replace(/\\/g, "/");
}

async function fileExists(projectRoot: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function findBridgeFiles(
  projectRoot: string,
  packageName: string,
): Promise<{ utility: VisionBridgeFileStatus; diagnosticOpMode: VisionBridgeFileStatus }> {
  const utilityPath = bridgeRelativePath(packageName, VISION_BRIDGE_CLASS_NAMES.utility);
  const opModePath = bridgeRelativePath(packageName, VISION_BRIDGE_CLASS_NAMES.opMode);
  const utilityPresent = await fileExists(projectRoot, utilityPath);
  const opModePresent = await fileExists(projectRoot, opModePath);

  if (utilityPresent && opModePresent) {
    return {
      utility: { relativePath: utilityPath, present: true },
      diagnosticOpMode: { relativePath: opModePath, present: true },
    };
  }

  // Fallback: scan TeamCode for class names (supports custom packages).
  let scannedUtility: string | undefined;
  let scannedOpMode: string | undefined;
  const teamCodeRoot = path.join(projectRoot, "TeamCode", "src", "main", "java");

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.name.endsWith(".java")) {
        continue;
      }
      const rel = path.relative(projectRoot, full).replace(/\\/g, "/");
      if (entry.name === `${VISION_BRIDGE_CLASS_NAMES.utility}.java`) {
        scannedUtility = rel;
      }
      if (entry.name === `${VISION_BRIDGE_CLASS_NAMES.opMode}.java`) {
        scannedOpMode = rel;
      }
    }
  }

  await walk(teamCodeRoot);

  return {
    utility: {
      relativePath: scannedUtility ?? utilityPath,
      present: Boolean(scannedUtility) || utilityPresent,
    },
    diagnosticOpMode: {
      relativePath: scannedOpMode ?? opModePath,
      present: Boolean(scannedOpMode) || opModePresent,
    },
  };
}

function resolvePreferredTransports(ftcDashboardDetected: boolean): VisionBridgeTransport[] {
  return VISION_BRIDGE_TRANSPORT_PRIORITY.filter((transport) => {
    if (transport === "ftc-dashboard") {
      return ftcDashboardDetected;
    }
    return true;
  });
}

export async function getVisionBridgeStatus(
  projectRoot: string,
): Promise<VisionBridgeStatusReport> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const packageName = defaultBridgePackage();
  const workspace = await discoverVisionWorkspace(root);
  const portalDiscovery = await discoverVisionPortalWorkspace(root);
  const dashboard = await detectFtcDashboardDependency(root);
  const visionPortalDetected = workspace.signals.some((signal) => signal.kind === "visionportal");
  const hasDetailedPortalConfig = portalDiscovery.configs.some(
    (config) =>
      Boolean(config.cameraName) ||
      Boolean(config.resolution) ||
      Boolean(config.streamFormat) ||
      config.processors.length > 0,
  );
  const ftcDashboardDetected = dashboard.detected;

  const adapter = new OfficialFtcProjectAdapter();
  let isOfficial = false;
  try {
    const info = await adapter.inspect(root);
    isOfficial = info.kind !== "unknown" && Boolean(info.teamCodeSourcePath);
  } catch {
    // not an official FTC project layout
  }

  const files = await findBridgeFiles(root, packageName);
  const preferredTransports = resolvePreferredTransports(ftcDashboardDetected);

  const warnings: string[] = [
    "The diagnostic bridge is optional and for development diagnostics only.",
    "It cannot actuate robot hardware and must not replace the Driver Station.",
    "Prefer Logcat or FTC Dashboard transports before adding new socket protocols.",
  ];
  if (!visionPortalDetected) {
    warnings.push(
      "VisionPortal not detected in this project yet; scaffold creates placeholder diagnostics until VisionPortal is added.",
    );
  } else if (!hasDetailedPortalConfig) {
    warnings.push(
      "VisionPortal import detected but camera/processor details were not found — run `ftc vision visionportal status` after configuring VisionPortal.",
    );
  }
  if (files.utility.present && files.diagnosticOpMode.present) {
    const utilityVersionMatch = await readBridgeVersion(root, files.utility.relativePath);
    if (utilityVersionMatch && utilityVersionMatch !== VISION_BRIDGE_CODE_VERSION) {
      warnings.push(
        `Bridge utility version ${utilityVersionMatch} differs from tool version ${VISION_BRIDGE_CODE_VERSION}.`,
      );
    }
  }

  let message: string;
  if (!isOfficial) {
    message = "Not an official FTC project; bridge status is limited.";
  } else if (files.utility.present && files.diagnosticOpMode.present) {
    message = "Vision diagnostic bridge files are present in TeamCode.";
  } else {
    message =
      "Vision diagnostic bridge is not scaffolded yet. Run `ftc vision bridge scaffold --yes`.";
  }

  return {
    projectRoot: root,
    schemaVersion: VISION_DIAGNOSTIC_SCHEMA_VERSION,
    bridgeCodeVersion: VISION_BRIDGE_CODE_VERSION,
    visionPortalDetected,
    ftcDashboardDetected,
    bridgeUtility: files.utility,
    diagnosticOpMode: files.diagnosticOpMode,
    preferredTransports,
    capabilities: {
      scaffoldSupported: isOfficial,
      liveVisionPortalDiagnostics: visionPortalDetected && hasDetailedPortalConfig,
      ftcDashboardTelemetry: ftcDashboardDetected,
    },
    warnings,
    message,
    generatedAt,
  };
}

async function readBridgeVersion(
  projectRoot: string,
  relativePath: string,
): Promise<string | undefined> {
  try {
    const text = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
    const match = text.match(/BRIDGE_VERSION\s*=\s*"([^"]+)"/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export function resolveVisionBridgePackage(packageName?: string): string {
  const value = packageName?.trim() || defaultBridgePackage();
  return value;
}

export function planVisionBridgeScaffoldPaths(packageName: string): string[] {
  return [
    bridgeRelativePath(packageName, VISION_BRIDGE_CLASS_NAMES.utility),
    bridgeRelativePath(packageName, VISION_BRIDGE_CLASS_NAMES.opMode),
  ];
}
