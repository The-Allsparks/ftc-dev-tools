import fs from "node:fs/promises";
import path from "node:path";
import { gradleWrapperName } from "../paths/os-paths.js";

export interface GradleWrapperInfo {
  found: boolean;
  wrapperPath?: string;
  propertiesPath?: string;
  executableOnUnix?: boolean;
}

export async function findGradleWrapper(
  projectRoot: string,
  platform: NodeJS.Platform = process.platform,
): Promise<GradleWrapperInfo> {
  const wrapperName = gradleWrapperName(platform);
  const wrapperPath = path.join(projectRoot, wrapperName);
  const propertiesPath = path.join(projectRoot, "gradle", "wrapper", "gradle-wrapper.properties");

  let wrapperExists = false;
  try {
    const stat = await fs.stat(wrapperPath);
    wrapperExists = stat.isFile();
  } catch {
    wrapperExists = false;
  }

  let propertiesExists = false;
  try {
    const stat = await fs.stat(propertiesPath);
    propertiesExists = stat.isFile();
  } catch {
    propertiesExists = false;
  }

  if (!wrapperExists) {
    return { found: false };
  }

  let executableOnUnix: boolean | undefined;
  if (platform !== "win32") {
    try {
      await fs.access(wrapperPath, fs.constants.X_OK);
      executableOnUnix = true;
    } catch {
      executableOnUnix = false;
    }
  }

  return {
    found: true,
    wrapperPath,
    propertiesPath: propertiesExists ? propertiesPath : undefined,
    executableOnUnix,
  };
}

export function buildGradleCommand(
  wrapperPath: string,
  tasks: string[],
  cwd: string,
  extraArgs: string[] = [],
): { command: string; args: string[]; cwd: string } {
  // On Windows, spawn gradlew.bat directly; on Unix use the wrapper path.
  return {
    command: wrapperPath,
    args: [...tasks, ...extraArgs],
    cwd,
  };
}
