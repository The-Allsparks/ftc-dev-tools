import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import { isGitWorkingTreeDirty } from "../sdk/sync-sdk-update.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_OPMODE_PACKAGE, isValidJavaClassName, packageToRelativePath } from "./defaults.js";
import { renderOpModeSource } from "./templates.js";
import type { CreateOpModeResult, OpModeKind, OpModeStyle } from "./types.js";

export interface CreateOpModeOptions {
  projectRoot: string;
  runner: ProcessRunner;
  className: string;
  kind: OpModeKind;
  style?: OpModeStyle;
  group?: string;
  packageName?: string;
  /** Annotation display name; defaults to className. */
  name?: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

export async function createOpMode(options: CreateOpModeOptions): Promise<CreateOpModeResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const className = options.className.trim();
  const style: OpModeStyle = options.style ?? "linear";
  const packageName = (options.packageName ?? DEFAULT_OPMODE_PACKAGE).trim();
  const displayName = (options.name ?? className).trim();

  try {
    if (!isValidJavaClassName(className)) {
      return {
        success: false,
        dryRun,
        className,
        message: `Invalid Java class name: ${className}`,
        error: interpretFromUnknown(
          Object.assign(new Error(`Invalid Java class name: ${className}`), {
            code: "OPMODE_INVALID_NAME",
          }),
        ),
      };
    }

    const adapter = new OfficialFtcProjectAdapter();
    const info = await adapter.inspect(projectRoot);
    if (!info.teamCodeSourcePath) {
      return {
        success: false,
        dryRun,
        className,
        message: "No TeamCode source path found.",
        error: interpretFromUnknown(
          Object.assign(new Error("TeamCode missing"), { code: "OPMODE_PROJECT_UNSUPPORTED" }),
        ),
      };
    }

    const relativePath = path
      .join(
        "TeamCode",
        "src",
        "main",
        "java",
        packageToRelativePath(packageName),
        `${className}.java`,
      )
      .replace(/\\/g, "/");
    const absolutePath = path.join(projectRoot, relativePath);

    let exists = false;
    try {
      await fs.access(absolutePath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !options.force) {
      return {
        success: false,
        dryRun,
        className,
        relativePath,
        absolutePath,
        message: `OpMode already exists: ${relativePath}. Pass --force to overwrite.`,
        error: interpretFromUnknown(
          Object.assign(new Error(`OpMode already exists: ${relativePath}`), {
            code: "OPMODE_EXISTS",
          }),
        ),
      };
    }

    const source = renderOpModeSource({
      className,
      kind: options.kind,
      style,
      packageName,
      name: displayName,
      group: options.group,
    });

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        className,
        relativePath,
        absolutePath,
        message: `Dry run: would ${exists ? "overwrite" : "create"} ${relativePath}`,
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        className,
        relativePath,
        absolutePath,
        message: "Refusing to create OpMode without --yes.",
        error: interpretFromUnknown(
          Object.assign(new Error("OpMode create requires --yes."), { code: "OPMODE_ABORTED" }),
        ),
      };
    }

    const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
    if (dirty && !options.force) {
      return {
        success: false,
        dryRun: false,
        className,
        relativePath,
        absolutePath,
        message: "Git working tree is dirty. Commit/stash changes or pass --force.",
        error: interpretFromUnknown(
          Object.assign(new Error("Refusing OpMode create while the git working tree is dirty."), {
            code: "OPMODE_DIRTY_TREE",
          }),
        ),
      };
    }

    let backupDirectory: string | undefined;
    if (exists) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupDirectory = path.join(projectRoot, ".ftc-dev-tools", "backups", `opmode-${stamp}`);
      await fs.mkdir(backupDirectory, { recursive: true });
      const backupPath = path.join(backupDirectory, path.basename(absolutePath));
      await fs.copyFile(absolutePath, backupPath);
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, source, "utf8");

    return {
      success: true,
      dryRun: false,
      className,
      relativePath,
      absolutePath,
      backupDirectory,
      message: `Created OpMode ${className} at ${relativePath}`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      className,
      message: "Failed to create OpMode.",
      error: interpretFromUnknown(error),
    };
  }
}
