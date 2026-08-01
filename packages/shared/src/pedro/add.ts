import fs from "node:fs/promises";
import path from "node:path";
import { interpretFromUnknown } from "../errors/interpret.js";
import { refuseMutationWithoutYes } from "../process/mutation-guard.js";
import type { ProcessRunner } from "../types/process.js";
import type { ProjectAdapter } from "../types/project.js";
import { isGitWorkingTreeDirty } from "../sdk/sync-sdk-update.js";
import type { FetchLike } from "../sdk/types.js";
import { detectPedroStatus } from "./detect.js";
import {
  PEDRO_FULLPANELS_VERSION,
  PEDRO_MIN_COMPILE_SDK,
  PEDRO_TELEMETRY_VERSION,
} from "./defaults.js";
import { patchBuildDependenciesGradle, patchCompileSdkInText } from "./gradle-patch.js";
import { resolvePedroFtcVersion } from "./resolve-version.js";
import type { PedroAddPlanEntry, PedroAddResult } from "./types.js";

export interface AddPedroOptions {
  projectRoot: string;
  runner: ProcessRunner;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  version?: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
  /** When true, bump compileSdk to 34 in known gradle files if below minimum. */
  patchCompileSdk?: boolean;
  adapter?: ProjectAdapter;
}

export async function addPedroPathing(options: AddPedroOptions): Promise<PedroAddResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const warnings: string[] = [];
  const plan: PedroAddPlanEntry[] = [];

  try {
    const status = await detectPedroStatus(projectRoot, { adapter: options.adapter });
    if (!status.dependenciesPath) {
      return {
        success: false,
        dryRun,
        plan,
        message: "build.dependencies.gradle not found.",
        warnings: status.warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("build.dependencies.gradle missing"), {
            code: "PEDRO_PROJECT_UNSUPPORTED",
          }),
        ),
      };
    }

    const ftcVersion = await resolvePedroFtcVersion({
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      version: options.version,
    });

    const originalDeps = await fs.readFile(status.dependenciesPath, "utf8");
    const patched = patchBuildDependenciesGradle(originalDeps, {
      ftcVersion,
      telemetryVersion: PEDRO_TELEMETRY_VERSION,
      fullpanelsVersion: PEDRO_FULLPANELS_VERSION,
    });
    for (const change of patched.changes) {
      plan.push({
        kind:
          change.startsWith("Add byalazar") || change.includes("repositories")
            ? "repo"
            : "dependency",
        description: change,
      });
    }

    const compileSdkTargets: string[] = [];
    if (options.patchCompileSdk !== false) {
      const candidates = [
        "build.common.gradle",
        path.join("TeamCode", "build.gradle"),
        path.join("FtcRobotController", "build.gradle"),
      ];
      for (const rel of candidates) {
        const full = path.join(projectRoot, rel);
        try {
          const text = await fs.readFile(full, "utf8");
          const result = patchCompileSdkInText(text, PEDRO_MIN_COMPILE_SDK);
          if (result.changed) {
            compileSdkTargets.push(rel);
            plan.push({
              kind: "compileSdk",
              description: `Set compileSdk to ${PEDRO_MIN_COMPILE_SDK} in ${rel}`,
            });
          }
        } catch {
          // optional files
        }
      }
      if (
        status.compileSdk !== undefined &&
        status.compileSdk < PEDRO_MIN_COMPILE_SDK &&
        compileSdkTargets.length === 0
      ) {
        warnings.push(
          `compileSdk ${status.compileSdk} is below ${PEDRO_MIN_COMPILE_SDK}, but no patchable gradle file was found. Set compileSdk manually.`,
        );
      }
    }

    if (plan.length === 0) {
      return {
        success: true,
        dryRun,
        plan,
        ftcVersion,
        message: `Pedro Pathing dependencies already present (ftc ${ftcVersion}).`,
        warnings: [...warnings, ...status.warnings],
      };
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        plan,
        ftcVersion,
        message: `Dry run: would apply ${plan.length} Pedro Pathing gradle change(s) (ftc ${ftcVersion}).`,
        warnings: [...warnings, ...status.warnings],
      };
    }

    if (!options.yes) {
      const refusal = refuseMutationWithoutYes({
        actionDescription: "add Pedro Pathing",
        code: "PEDRO_ABORTED",
      });
      return {
        success: false,
        dryRun: true,
        plan,
        ftcVersion,
        message: refusal.message,
        warnings: [...warnings, ...status.warnings],
        error: refusal.error,
      };
    }

    const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
    if (dirty && !options.force) {
      return {
        success: false,
        dryRun: false,
        plan,
        ftcVersion,
        message: "Git working tree is dirty. Commit/stash changes or pass --force.",
        warnings: [...warnings, ...status.warnings],
        error: interpretFromUnknown(
          Object.assign(new Error("Refusing Pedro changes while the git working tree is dirty."), {
            code: "PEDRO_DIRTY_TREE",
          }),
        ),
      };
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDirectory = path.join(
      projectRoot,
      ".ftc-dev-tools",
      "backups",
      `pedro-add-${stamp}`,
    );
    await fs.mkdir(backupDirectory, { recursive: true });
    await fs.copyFile(
      status.dependenciesPath,
      path.join(backupDirectory, "build.dependencies.gradle"),
    );

    await fs.writeFile(status.dependenciesPath, patched.text, "utf8");

    for (const rel of compileSdkTargets) {
      const full = path.join(projectRoot, rel);
      const text = await fs.readFile(full, "utf8");
      const result = patchCompileSdkInText(text, PEDRO_MIN_COMPILE_SDK);
      const backupPath = path.join(backupDirectory, rel);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.copyFile(full, backupPath);
      await fs.writeFile(full, result.text, "utf8");
    }

    return {
      success: true,
      dryRun: false,
      plan,
      ftcVersion,
      backupDirectory,
      message: `Added Pedro Pathing dependencies (ftc ${ftcVersion}). Sync Gradle, then run \`ftc pedro scaffold\`.`,
      warnings: [...warnings, ...status.warnings],
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      plan,
      message: "Failed to add Pedro Pathing.",
      warnings,
      error: interpretFromUnknown(error),
    };
  }
}
