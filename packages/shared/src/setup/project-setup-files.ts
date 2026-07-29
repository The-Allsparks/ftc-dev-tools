import fs from "node:fs/promises";
import path from "node:path";

export const FTC_PROJECT_RECOMMENDED_EXTENSIONS = [
  "vscjava.vscode-java-pack",
  "vscjava.vscode-java-test",
  "redhat.vscode-xml",
] as const;

export type ParseJsonResult = { ok: true; value: unknown } | { ok: false; error: string };

export function parseJsonStrict(text: string): ParseJsonResult {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export function mergeExtensionsJson(existing: unknown): Record<string, unknown> {
  const obj =
    existing !== null && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const current = Array.isArray(obj.recommendations) ? (obj.recommendations as string[]) : [];
  obj.recommendations = [...new Set([...current, ...FTC_PROJECT_RECOMMENDED_EXTENSIONS])].sort();
  return obj;
}

export function mergeFtcWorkspaceSettings(
  existing: unknown,
  options?: { javaHome?: string },
): Record<string, unknown> {
  const settings =
    existing !== null && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const next: Record<string, unknown> = {
    ...settings,
    "java.configuration.updateBuildConfiguration":
      settings["java.configuration.updateBuildConfiguration"] ?? "automatic",
    "files.exclude": {
      ...((settings["files.exclude"] as Record<string, unknown> | undefined) ?? {}),
      "**/.gradle": true,
      "**/build": true,
    },
  };
  const suggestedJavaHome = options?.javaHome?.trim();
  if (suggestedJavaHome && !String(settings["ftc.javaHome"] ?? "").trim()) {
    next["ftc.javaHome"] = suggestedJavaHome;
  }
  delete next["ftc.preferredDeviceSerial"];
  return next;
}

export function formatJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export type FtcProjectTasksMode = "cli" | "extension";

const FTC_TASK_PRESENTATION = {
  reveal: "always",
  panel: "shared",
  focus: false,
} as const;

const FTC_TASK_OPTIONS = {
  cwd: "${workspaceFolder}",
} as const;

function ftcShellTask(
  label: string,
  args: string[],
  group?: { kind: "build"; isDefault?: boolean },
): Record<string, unknown> {
  return {
    label,
    type: "shell",
    command: "ftc",
    args,
    options: FTC_TASK_OPTIONS,
    presentation: FTC_TASK_PRESENTATION,
    problemMatcher: [],
    ...(group ? { group } : {}),
  };
}

function ftcExtensionTask(
  label: string,
  action: "build" | "deploy" | "buildAndDeploy",
  group?: { kind: "build"; isDefault?: boolean },
): Record<string, unknown> {
  return {
    label,
    type: "ftc-dev-tools",
    action,
    presentation: FTC_TASK_PRESENTATION,
    problemMatcher: [],
    ...(group ? { group } : {}),
  };
}

/** Default `.vscode/tasks.json` content for FTC project setup (Run Task menu). */
export function buildFtcProjectTasksDocument(mode: FtcProjectTasksMode): Record<string, unknown> {
  const buildGroup = { kind: "build" as const, isDefault: true };
  if (mode === "cli") {
    return {
      version: "2.0.0",
      tasks: [
        ftcShellTask("FTC: Build Robot Code", ["build"], buildGroup),
        ftcShellTask("FTC: Deploy to Robot", ["deploy"]),
        ftcShellTask("FTC: Build and Deploy", ["deploy"]),
      ],
    };
  }
  return {
    version: "2.0.0",
    tasks: [
      ftcExtensionTask("FTC: Build Robot Code", "build", buildGroup),
      ftcExtensionTask("FTC: Deploy to Robot", "deploy"),
      ftcExtensionTask("FTC: Build and Deploy", "buildAndDeploy"),
    ],
  };
}

export interface SetupBackupInfo {
  id: string;
  createdAt: string;
  files: string[];
}

function setupBackupRoot(projectRoot: string): string {
  return path.join(projectRoot, ".ftc-dev-tools", "backups", "setup");
}

export async function backupFileBeforeWrite(
  projectRoot: string,
  absoluteFilePath: string,
): Promise<string | undefined> {
  try {
    await fs.access(absoluteFilePath);
  } catch {
    return undefined;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(setupBackupRoot(projectRoot), stamp);
  const relative = path.relative(projectRoot, absoluteFilePath);
  const dest = path.join(backupDir, relative);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(absoluteFilePath, dest);
  await fs.writeFile(
    path.join(backupDir, "manifest.json"),
    `${JSON.stringify({ createdAt: new Date().toISOString(), files: [relative.replace(/\\/g, "/")] }, null, 2)}\n`,
    "utf8",
  );
  return backupDir;
}

export async function listSetupBackups(projectRoot: string): Promise<SetupBackupInfo[]> {
  const root = setupBackupRoot(projectRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }

  const backups: SetupBackupInfo[] = [];
  for (const id of entries.sort().reverse()) {
    const dir = path.join(root, id);
    const stat = await fs.stat(dir).catch(() => undefined);
    if (!stat?.isDirectory()) {
      continue;
    }
    let manifest: { createdAt?: string; files?: string[] };
    try {
      manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8")) as {
        createdAt?: string;
        files?: string[];
      };
    } catch {
      const files: string[] = [];
      async function walk(current: string, prefix: string): Promise<void> {
        const items = await fs.readdir(current, { withFileTypes: true });
        for (const item of items) {
          if (item.name === "manifest.json") {
            continue;
          }
          const rel = prefix ? `${prefix}/${item.name}` : item.name;
          const full = path.join(current, item.name);
          if (item.isDirectory()) {
            await walk(full, rel);
          } else if (item.isFile()) {
            files.push(rel.replace(/\\/g, "/"));
          }
        }
      }
      await walk(dir, "");
      manifest = { createdAt: stat.mtime.toISOString(), files };
    }
    backups.push({
      id,
      createdAt: manifest.createdAt ?? stat.mtime.toISOString(),
      files: manifest.files ?? [],
    });
  }
  return backups;
}

export async function restoreSetupBackup(
  projectRoot: string,
  backupId: string,
): Promise<{ success: boolean; message: string; restoredPaths: string[] }> {
  const backupDir = path.join(setupBackupRoot(projectRoot), backupId);
  try {
    const stat = await fs.stat(backupDir);
    if (!stat.isDirectory()) {
      return { success: false, message: "Backup not found.", restoredPaths: [] };
    }
  } catch {
    return { success: false, message: "Backup not found.", restoredPaths: [] };
  }

  const restoredPaths: string[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    const items = await fs.readdir(current, { withFileTypes: true });
    for (const item of items) {
      if (item.name === "manifest.json") {
        continue;
      }
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      const from = path.join(current, item.name);
      const to = path.join(projectRoot, rel);
      if (item.isDirectory()) {
        await walk(from, rel);
      } else if (item.isFile()) {
        await fs.mkdir(path.dirname(to), { recursive: true });
        await fs.copyFile(from, to);
        restoredPaths.push(rel.replace(/\\/g, "/"));
      }
    }
  }
  await walk(backupDir, "");
  return {
    success: true,
    message: `Restored ${restoredPaths.length} file(s) from setup backup ${backupId}.`,
    restoredPaths,
  };
}
