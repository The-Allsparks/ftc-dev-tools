import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import {
  DEFAULT_OPMODE_PACKAGE,
  isValidJavaClassName,
  isValidJavaPackageName,
  packageToRelativePath,
} from "../opmode/defaults.js";
import type { OpModeKind, OpModeStyle } from "../opmode/types.js";
import { isGitWorkingTreeDirty } from "../sdk/sync-sdk-update.js";
import type { ProcessRunner } from "../types/process.js";
import { buildHardwareMapEntries, resolveConfigForHwMap } from "./resolve.js";
import { renderHwMapOpModeSource } from "./templates.js";
import type { HardwareMapCodegenResult } from "./types.js";

export interface CodegenHardwareMapOptions {
  projectRoot: string;
  runner: ProcessRunner;
  configName?: string;
  className: string;
  kind?: OpModeKind;
  style?: OpModeStyle;
  group?: string;
  packageName?: string;
  /** Annotation display name; defaults to className. */
  name?: string;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

export async function codegenHardwareMapOpMode(
  options: CodegenHardwareMapOptions,
): Promise<HardwareMapCodegenResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const className = options.className.trim();
  const style: OpModeStyle = options.style ?? "linear";
  const kind: OpModeKind = options.kind ?? "teleop";
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

    if (!isValidJavaPackageName(packageName)) {
      return {
        success: false,
        dryRun,
        className,
        message: `Invalid Java package name: ${packageName}`,
        error: interpretFromUnknown(
          Object.assign(new Error(`Invalid Java package name: ${packageName}`), {
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
          Object.assign(new Error("TeamCode missing"), { code: "HWMAP_PROJECT_UNSUPPORTED" }),
        ),
      };
    }

    const resolved = await resolveConfigForHwMap(projectRoot, options.configName);
    if (!resolved.config) {
      return {
        success: false,
        dryRun,
        className,
        message: resolved.errorMessage ?? "Failed to resolve robot config.",
        error: interpretFromUnknown(
          Object.assign(new Error(resolved.errorMessage ?? "hwmap config"), {
            code: resolved.code ?? "HWMAP_NO_CONFIG",
          }),
        ),
      };
    }

    const entries = await buildHardwareMapEntries(resolved.config.absolutePath);
    const codegenEntries = entries.filter((e) => e.includedInCodegen);
    if (codegenEntries.length === 0) {
      return {
        success: false,
        dryRun,
        className,
        configName: resolved.config.name,
        entryCount: 0,
        message: `Config "${resolved.config.name}" has no codegen-ready devices.`,
        error: interpretFromUnknown(
          Object.assign(new Error("No codegen-ready hardware map devices"), {
            code: "HWMAP_EMPTY",
          }),
        ),
      };
    }

    const javaRoot = path.join(projectRoot, "TeamCode", "src", "main", "java");
    const relativePath = path
      .join("TeamCode", "src", "main", "java", packageToRelativePath(packageName), `${className}.java`)
      .replace(/\\/g, "/");
    const absolutePath = path.resolve(projectRoot, relativePath);
    const relToJava = path.relative(path.resolve(javaRoot), absolutePath);
    if (relToJava.startsWith("..") || path.isAbsolute(relToJava)) {
      return {
        success: false,
        dryRun,
        className,
        message: `Invalid Java package name: ${packageName}`,
        error: interpretFromUnknown(
          Object.assign(new Error(`Invalid Java package name: ${packageName}`), {
            code: "OPMODE_INVALID_NAME",
          }),
        ),
      };
    }

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
        configName: resolved.config.name,
        relativePath,
        absolutePath,
        entryCount: codegenEntries.length,
        message: `OpMode already exists: ${relativePath}. Pass --force to overwrite.`,
        error: interpretFromUnknown(
          Object.assign(new Error(`OpMode already exists: ${relativePath}`), {
            code: "OPMODE_EXISTS",
          }),
        ),
      };
    }

    const source = renderHwMapOpModeSource({
      className,
      kind,
      style,
      packageName,
      name: displayName,
      group: options.group,
      configName: resolved.config.name,
      entries,
    });

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        className,
        configName: resolved.config.name,
        relativePath,
        absolutePath,
        entryCount: codegenEntries.length,
        sourcePreview: source,
        message: `Dry run: would ${exists ? "overwrite" : "create"} ${relativePath} with ${codegenEntries.length} hardwareMap.get call(s) from "${resolved.config.name}".`,
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        className,
        configName: resolved.config.name,
        relativePath,
        absolutePath,
        entryCount: codegenEntries.length,
        sourcePreview: source,
        message: "Refusing to generate OpMode without --yes.",
        error: interpretFromUnknown(
          Object.assign(new Error("Hardware map codegen requires --yes."), {
            code: "HWMAP_ABORTED",
          }),
        ),
      };
    }

    const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
    if (dirty && !options.force) {
      return {
        success: false,
        dryRun: false,
        className,
        configName: resolved.config.name,
        relativePath,
        absolutePath,
        entryCount: codegenEntries.length,
        message: "Git working tree is dirty. Commit/stash changes or pass --force.",
        error: interpretFromUnknown(
          Object.assign(new Error("Refusing hwmap codegen while the git working tree is dirty."), {
            code: "HWMAP_DIRTY_TREE",
          }),
        ),
      };
    }

    let backupDirectory: string | undefined;
    if (exists) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupDirectory = path.join(projectRoot, ".ftc-dev-tools", "backups", `hwmap-${stamp}`);
      await fs.mkdir(backupDirectory, { recursive: true });
      await fs.copyFile(absolutePath, path.join(backupDirectory, path.basename(absolutePath)));
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, source, "utf8");

    return {
      success: true,
      dryRun: false,
      className,
      configName: resolved.config.name,
      relativePath,
      absolutePath,
      backupDirectory,
      entryCount: codegenEntries.length,
      sourcePreview: source,
      message: `Generated OpMode ${className} from config "${resolved.config.name}" (${codegenEntries.length} devices) at ${relativePath}`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      className,
      message: "Failed to generate OpMode from hardware map.",
      error: interpretFromUnknown(error),
    };
  }
}
