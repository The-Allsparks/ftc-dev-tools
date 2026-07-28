import fs from "node:fs/promises";
import path from "node:path";
import { SDK_OWNED_PATHS } from "./sync-sdk-update.js";

export interface SdkBackupInfo {
  id: string;
  directory: string;
  createdAt: string;
}

function sdkBackupRoot(projectRoot: string): string {
  return path.join(projectRoot, ".ftc-dev-tools", "backups");
}

export async function listSdkBackups(projectRoot: string): Promise<SdkBackupInfo[]> {
  const root = sdkBackupRoot(projectRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }

  const backups: SdkBackupInfo[] = [];
  for (const id of entries) {
    if (!id.startsWith("sdk-")) {
      continue;
    }
    const directory = path.join(root, id);
    const stat = await fs.stat(directory).catch(() => undefined);
    if (!stat?.isDirectory()) {
      continue;
    }
    backups.push({
      id,
      directory,
      createdAt: stat.mtime.toISOString(),
    });
  }
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function replacePathExact(from: string, to: string): Promise<void> {
  const stat = await fs.stat(from);
  if (stat.isDirectory()) {
    await fs.rm(to, { recursive: true, force: true }).catch(() => undefined);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.cp(from, to, { recursive: true, errorOnExist: false });
    return;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export interface RestoreSdkBackupOptions {
  projectRoot: string;
  backupId: string;
  /** When set, only restore these relative paths (must exist in backup). */
  relativePaths?: string[];
}

export interface RestoreSdkBackupResult {
  success: boolean;
  restoredPaths: string[];
  message: string;
}

export async function restoreSdkBackup(
  options: RestoreSdkBackupOptions,
): Promise<RestoreSdkBackupResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const backupDirectory = path.join(sdkBackupRoot(projectRoot), options.backupId);
  try {
    const stat = await fs.stat(backupDirectory);
    if (!stat.isDirectory()) {
      return { success: false, restoredPaths: [], message: "SDK backup not found." };
    }
  } catch {
    return { success: false, restoredPaths: [], message: "SDK backup not found." };
  }

  const pathsToRestore =
    options.relativePaths ??
    (await collectRelativePaths(backupDirectory)).filter((p) =>
      (SDK_OWNED_PATHS as readonly string[]).some(
        (owned) => p === owned || p.startsWith(`${owned}/`),
      ),
    );

  const restoredPaths: string[] = [];
  for (const relativePath of pathsToRestore) {
    const from = path.join(backupDirectory, relativePath);
    if (!(await pathExists(from))) {
      continue;
    }
    const to = path.join(projectRoot, relativePath);
    await replacePathExact(from, to);
    restoredPaths.push(relativePath);
  }

  return {
    success: restoredPaths.length > 0,
    restoredPaths,
    message:
      restoredPaths.length > 0
        ? `Restored ${restoredPaths.length} SDK path(s) from backup ${options.backupId}.`
        : "No SDK paths were restored (backup empty or paths missing).",
  };
}

async function collectRelativePaths(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        out.push(rel.replace(/\\/g, "/"));
        await walk(full, rel);
      } else if (entry.isFile()) {
        out.push(rel.replace(/\\/g, "/"));
      }
    }
  }
  await walk(root, "");
  return [...new Set(out)].sort();
}

export { replacePathExact };
