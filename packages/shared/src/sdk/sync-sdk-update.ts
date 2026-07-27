import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { CommandSpec, ProcessRunner } from "../types/process.js";
import { fetchLatestSdkRelease, fetchSdkReleaseByTag } from "./github-releases.js";
import type { FetchLike, SdkUpdatePlan, SdkUpdatePlanEntry, SdkUpdateResult } from "./types.js";

/** Relative paths synced from an official FtcRobotController release. Never includes TeamCode. */
export const SDK_OWNED_PATHS = [
  "FtcRobotController",
  "build.gradle",
  "build.common.gradle",
  "build.dependencies.gradle",
  "settings.gradle",
  "settings.gradle.kts",
  "gradle",
  "gradlew",
  "gradlew.bat",
] as const;

export interface PlanSdkUpdateOptions {
  projectRoot: string;
  sourceRoot: string;
  targetVersion: string;
  targetTag: string;
}

export interface ApplySdkUpdateOptions {
  projectRoot: string;
  runner: ProcessRunner;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  dryRun?: boolean;
  /** Required for a real (non-dry-run) apply. */
  yes?: boolean;
  /** Allow apply when git working tree is dirty. */
  force?: boolean;
  targetTag?: string;
  /** Inject an already-extracted upstream root (skips download; for tests). */
  sourceRoot?: string;
}

export async function planSdkUpdate(options: PlanSdkUpdateOptions): Promise<SdkUpdatePlan> {
  const projectRoot = path.resolve(options.projectRoot);
  const sourceRoot = path.resolve(options.sourceRoot);
  const entries: SdkUpdatePlanEntry[] = [];
  const warnings: string[] = [];

  for (const relativePath of SDK_OWNED_PATHS) {
    const sourcePath = path.join(sourceRoot, relativePath);
    const destPath = path.join(projectRoot, relativePath);
    const sourceExists = await pathExists(sourcePath);
    if (!sourceExists) {
      continue;
    }

    // Do not switch settings dialect: only sync the settings file the project already uses,
    // or add settings.gradle when the project has neither.
    if (relativePath === "settings.gradle" || relativePath === "settings.gradle.kts") {
      const projectHasGradle = await pathExists(path.join(projectRoot, "settings.gradle"));
      const projectHasKts = await pathExists(path.join(projectRoot, "settings.gradle.kts"));
      if (relativePath === "settings.gradle" && projectHasKts && !projectHasGradle) {
        continue;
      }
      if (relativePath === "settings.gradle.kts" && projectHasGradle && !projectHasKts) {
        continue;
      }
    }

    const destExists = await pathExists(destPath);
    if (!destExists) {
      entries.push({ relativePath, action: "add" });
      continue;
    }

    const same = await pathsSemanticallyEqual(sourcePath, destPath);
    entries.push({ relativePath, action: same ? "unchanged" : "overwrite" });
  }

  if (entries.some((e) => e.relativePath === "FtcRobotController" && e.action === "overwrite")) {
    warnings.push(
      "Local FtcRobotController customizations will be replaced by the upstream SDK copy.",
    );
  }

  if (entries.some((e) => e.relativePath.startsWith("TeamCode"))) {
    throw Object.assign(new Error("Internal error: TeamCode appeared in SDK update plan."), {
      code: "SDK_UPDATE_ABORTED",
    });
  }

  return {
    projectRoot,
    sourceRoot,
    targetVersion: options.targetVersion,
    targetTag: options.targetTag,
    entries,
    teamCodePreserved: true,
    warnings,
  };
}

export async function applySdkUpdate(options: ApplySdkUpdateOptions): Promise<SdkUpdateResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;

  try {
    if (!dryRun && !options.yes) {
      return {
        success: false,
        dryRun,
        appliedPaths: [],
        message: "Refusing to apply SDK update without --yes (or confirmation).",
        error: interpretFromUnknown(
          Object.assign(new Error("SDK update aborted: confirmation required."), {
            code: "SDK_UPDATE_ABORTED",
          }),
        ),
      };
    }

    const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
    if (dirty && !options.force && !dryRun) {
      return {
        success: false,
        dryRun,
        appliedPaths: [],
        message: "Git working tree is dirty. Commit/stash changes or pass --force.",
        error: interpretFromUnknown(
          Object.assign(new Error("Git working tree is dirty."), {
            code: "SDK_UPDATE_DIRTY_TREE",
          }),
        ),
      };
    }

    let sourceRoot = options.sourceRoot ? path.resolve(options.sourceRoot) : undefined;
    let targetVersion: string;
    let targetTag: string;
    let cleanupTemp: string | undefined;

    if (sourceRoot) {
      targetTag = options.targetTag ?? "local";
      targetVersion = options.targetTag ?? "local";
    } else {
      const release = options.targetTag
        ? await fetchSdkReleaseByTag(options.targetTag, {
            fetchImpl: options.fetchImpl,
            signal: options.signal,
          })
        : await fetchLatestSdkRelease({
            fetchImpl: options.fetchImpl,
            signal: options.signal,
          });
      targetTag = release.tagName;
      targetVersion = release.version;
      const extracted = await downloadAndExtractRelease({
        zipballUrl: release.zipballUrl,
        runner: options.runner,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
      });
      sourceRoot = extracted.sourceRoot;
      cleanupTemp = extracted.tempDir;
    }

    try {
      const plan = await planSdkUpdate({
        projectRoot,
        sourceRoot,
        targetVersion,
        targetTag,
      });

      const toApply = plan.entries.filter((e) => e.action === "add" || e.action === "overwrite");
      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          plan,
          appliedPaths: toApply.map((e) => e.relativePath),
          message: `Dry run: would update ${toApply.length} SDK-owned path(s) to ${targetTag}. TeamCode preserved.`,
        };
      }

      if (toApply.length === 0) {
        return {
          success: true,
          dryRun: false,
          plan,
          appliedPaths: [],
          message: `Project already matches SDK ${targetTag} for all syncable paths.`,
        };
      }

      const backupDirectory = await createBackup(projectRoot, toApply.map((e) => e.relativePath));
      const appliedPaths: string[] = [];
      for (const entry of toApply) {
        const from = path.join(sourceRoot, entry.relativePath);
        const to = path.join(projectRoot, entry.relativePath);
        await copyPath(from, to);
        appliedPaths.push(entry.relativePath);
      }

      return {
        success: true,
        dryRun: false,
        plan,
        backupDirectory,
        appliedPaths,
        message: `Updated ${appliedPaths.length} SDK-owned path(s) to ${targetTag}. TeamCode was not modified. Backup: ${backupDirectory}`,
      };
    } finally {
      if (cleanupTemp) {
        await fs.rm(cleanupTemp, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  } catch (error) {
    return {
      success: false,
      dryRun,
      appliedPaths: [],
      message: "SDK update failed.",
      error: interpretFromUnknown(error),
    };
  }
}

async function downloadAndExtractRelease(options: {
  zipballUrl: string;
  runner: ProcessRunner;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}): Promise<{ tempDir: string; sourceRoot: string }> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available."), { code: "SDK_UPDATE_NETWORK" });
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-sdk-"));
  const zipPath = path.join(tempDir, "sdk.zip");
  const extractDir = path.join(tempDir, "extract");
  await fs.mkdir(extractDir, { recursive: true });

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(options.zipballUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ftc-dev-tools",
      },
      signal: options.signal,
    });
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`Failed to download SDK archive: ${message}`), {
      code: "SDK_UPDATE_NETWORK",
      technicalDetails: message,
    });
  }

  if (!response.ok) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw Object.assign(
      new Error(`SDK archive download failed: ${response.status} ${response.statusText}`),
      { code: "SDK_UPDATE_NETWORK" },
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(zipPath, buffer);

  const extractSpec: CommandSpec = {
    command: "tar",
    args: ["-xf", zipPath, "-C", extractDir],
    cwd: tempDir,
  };
  const result = await options.runner.run(extractSpec);
  if (result.exitCode !== 0) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw Object.assign(new Error("Failed to extract SDK archive with tar."), {
      code: "SDK_UPDATE_NETWORK",
      technicalDetails: result.stderr || result.stdout,
    });
  }

  const sourceRoot = await findExtractedProjectRoot(extractDir);
  return { tempDir, sourceRoot };
}

async function findExtractedProjectRoot(extractDir: string): Promise<string> {
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(extractDir, e.name));
  for (const dir of dirs) {
    if (await pathExists(path.join(dir, "build.dependencies.gradle"))) {
      return dir;
    }
    if (await pathExists(path.join(dir, "FtcRobotController"))) {
      return dir;
    }
  }
  if (await pathExists(path.join(extractDir, "build.dependencies.gradle"))) {
    return extractDir;
  }
  throw Object.assign(new Error("Could not locate FTC project root inside SDK archive."), {
    code: "SDK_UPDATE_NETWORK",
  });
}

export async function isGitWorkingTreeDirty(
  runner: ProcessRunner,
  projectRoot: string,
): Promise<boolean> {
  const result = await runner.run({
    command: "git",
    args: ["status", "--porcelain"],
    cwd: projectRoot,
  });
  if (result.exitCode !== 0) {
    // Not a git repo or git missing — treat as clean for apply; backup still created.
    return false;
  }
  return result.stdout.trim().length > 0;
}

async function createBackup(projectRoot: string, relativePaths: string[]): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDirectory = path.join(projectRoot, ".ftc-dev-tools", "backups", `sdk-${stamp}`);
  await fs.mkdir(backupDirectory, { recursive: true });
  for (const relativePath of relativePaths) {
    const from = path.join(projectRoot, relativePath);
    if (!(await pathExists(from))) {
      continue;
    }
    const to = path.join(backupDirectory, relativePath);
    await copyPath(from, to);
  }
  return backupDirectory;
}

async function copyPath(from: string, to: string): Promise<void> {
  const stat = await fs.stat(from);
  if (stat.isDirectory()) {
    await fs.cp(from, to, { recursive: true, force: true });
    return;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function pathsSemanticallyEqual(a: string, b: string): Promise<boolean> {
  const aStat = await fs.stat(a);
  const bStat = await fs.stat(b);
  if (aStat.isDirectory() && bStat.isDirectory()) {
    return directoryFingerprintsEqual(a, b);
  }
  if (aStat.isFile() && bStat.isFile()) {
    const [aBuf, bBuf] = await Promise.all([fs.readFile(a), fs.readFile(b)]);
    return aBuf.equals(bBuf);
  }
  return false;
}

async function directoryFingerprintsEqual(a: string, b: string): Promise<boolean> {
  const aFiles = await listRelativeFiles(a);
  const bFiles = await listRelativeFiles(b);
  if (aFiles.length !== bFiles.length) {
    return false;
  }
  for (let i = 0; i < aFiles.length; i++) {
    if (aFiles[i] !== bFiles[i]) {
      return false;
    }
    const aBuf = await fs.readFile(path.join(a, aFiles[i]!));
    const bBuf = await fs.readFile(path.join(b, bFiles[i]!));
    if (!aBuf.equals(bBuf)) {
      return false;
    }
  }
  return true;
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((x, y) => x.name.localeCompare(y.name));
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        out.push(rel.replace(/\\/g, "/"));
      }
    }
  }
  await walk(root, "");
  return out;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
