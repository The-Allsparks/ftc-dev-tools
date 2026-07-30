import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../../errors/interpret.js";
import { isValidJavaPackageName } from "../../opmode/defaults.js";
import { isGitWorkingTreeDirty } from "../../sdk/sync-sdk-update.js";
import type { ProcessRunner } from "../../types/process.js";
import { planVisionBridgeScaffoldPaths, resolveVisionBridgePackage } from "./status.js";
import {
  renderVisionDiagnosticBridgeSource,
  renderVisionDiagnosticOpModeSource,
} from "./templates.js";
import type { VisionBridgeScaffoldPlanEntry, VisionBridgeScaffoldResult } from "./types.js";
import { VISION_BRIDGE_CLASS_NAMES } from "./constants.js";

export interface ScaffoldVisionBridgeOptions {
  projectRoot: string;
  runner: ProcessRunner;
  packageName?: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

export async function scaffoldVisionBridge(
  options: ScaffoldVisionBridgeOptions,
): Promise<VisionBridgeScaffoldResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const packageName = resolveVisionBridgePackage(options.packageName);
  const warnings: string[] = [
    "Scaffolded bridge is optional. Remove files if your team does not use Vision Lab diagnostics.",
    "Run the diagnostic OpMode only during development — never at competition.",
  ];

  if (!isValidJavaPackageName(packageName)) {
    return {
      success: false,
      dryRun,
      plan: [],
      appliedPaths: [],
      packageName,
      message: `Invalid Java package name: ${packageName}`,
      warnings,
      error: interpretFromUnknown(
        Object.assign(new Error(`Invalid Java package: ${packageName}`), {
          code: "BRIDGE_INVALID_PACKAGE",
        }),
      ),
    };
  }

  try {
    const adapter = new OfficialFtcProjectAdapter();
    const info = await adapter.inspect(projectRoot);
    if (!info.teamCodeSourcePath) {
      return {
        success: false,
        dryRun,
        plan: [],
        appliedPaths: [],
        packageName,
        message: "Official FTC project with TeamCode is required for bridge scaffold.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("TeamCode missing"), { code: "BRIDGE_PROJECT_UNSUPPORTED" }),
        ),
      };
    }

    const files = [
      {
        relativePath: planVisionBridgeScaffoldPaths(packageName)[0]!,
        content: renderVisionDiagnosticBridgeSource({ packageName }),
      },
      {
        relativePath: planVisionBridgeScaffoldPaths(packageName)[1]!,
        content: renderVisionDiagnosticOpModeSource({ packageName }),
      },
    ];

    const plan: VisionBridgeScaffoldPlanEntry[] = [];
    for (const file of files) {
      let action: VisionBridgeScaffoldPlanEntry["action"] = "add";
      try {
        await fs.access(path.join(projectRoot, file.relativePath));
        action = options.force ? "overwrite" : "skip";
      } catch {
        action = "add";
      }
      plan.push({ relativePath: file.relativePath, action });
    }

    const blocked = plan.filter((entry) => entry.action === "skip");
    if (blocked.length > 0 && !options.force) {
      return {
        success: false,
        dryRun,
        plan,
        appliedPaths: [],
        packageName,
        message: `Bridge files already exist (${blocked.map((entry) => entry.relativePath).join(", ")}). Pass --force to overwrite.`,
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("Bridge scaffold files already exist"), {
            code: "BRIDGE_SCAFFOLD_EXISTS",
          }),
        ),
      };
    }

    if (!dryRun && !options.yes) {
      return {
        success: false,
        dryRun,
        plan,
        appliedPaths: [],
        packageName,
        message: "Refusing to scaffold vision bridge without --yes.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("Bridge scaffold requires --yes."), {
            code: "BRIDGE_ABORTED",
          }),
        ),
      };
    }

    if (!dryRun && !options.force) {
      const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
      if (dirty) {
        return {
          success: false,
          dryRun,
          plan,
          appliedPaths: [],
          packageName,
          message: "Refusing bridge scaffold while the git working tree is dirty.",
          warnings,
          error: interpretFromUnknown(
            Object.assign(new Error("Refusing bridge scaffold while git working tree is dirty."), {
              code: "BRIDGE_DIRTY_TREE",
            }),
          ),
        };
      }
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        plan,
        appliedPaths: [],
        packageName,
        message: `Dry run: would write ${plan.length} bridge file(s) under ${packageName}.`,
        warnings,
      };
    }

    const appliedPaths: string[] = [];
    for (const file of files) {
      const entry = plan.find((item) => item.relativePath === file.relativePath);
      if (entry?.action === "skip") {
        continue;
      }
      const absolutePath = path.join(projectRoot, file.relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.content, "utf8");
      appliedPaths.push(file.relativePath);
    }

    return {
      success: true,
      dryRun: false,
      plan,
      appliedPaths,
      packageName,
      message: `Scaffolded vision diagnostic bridge (${VISION_BRIDGE_CLASS_NAMES.utility}, ${VISION_BRIDGE_CLASS_NAMES.opMode}).`,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      plan: [],
      appliedPaths: [],
      packageName,
      message: "Failed to scaffold vision diagnostic bridge.",
      warnings,
      error: interpretFromUnknown(error),
    };
  }
}
