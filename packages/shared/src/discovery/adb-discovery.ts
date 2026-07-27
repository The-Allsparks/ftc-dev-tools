import fs from "node:fs/promises";
import path from "node:path";
import type { ProcessRunner } from "../types/process.js";
import { adbExecutableName, commonAndroidSdkCandidates } from "../paths/os-paths.js";

export interface AdbDiscoveryResult {
  found: boolean;
  adbPath?: string;
  sdkPath?: string;
  versionText?: string;
  source?: "path" | "sdk" | "env";
}

export async function discoverAndroidSdk(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<string | undefined> {
  for (const candidate of commonAndroidSdkCandidates(platform, env)) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // continue
    }
  }
  return undefined;
}

export async function discoverAdb(
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<AdbDiscoveryResult> {
  const sdkPath = await discoverAndroidSdk(env, platform);
  const executable = adbExecutableName(platform);

  if (sdkPath) {
    const sdkAdb = path.join(sdkPath, "platform-tools", executable);
    if (await isExecutableFile(sdkAdb)) {
      const versionText = await readAdbVersion(runner, sdkAdb);
      return {
        found: true,
        adbPath: sdkAdb,
        sdkPath,
        versionText,
        source: "sdk",
      };
    }
  }

  const whichCommand = platform === "win32" ? "where" : "which";
  try {
    const result = await runner.run(
      { command: whichCommand, args: ["adb"] },
      { timeoutMs: 10_000 },
    );
    if (result.exitCode === 0) {
      const adbPath = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      if (adbPath) {
        const versionText = await readAdbVersion(runner, adbPath);
        return {
          found: true,
          adbPath,
          sdkPath,
          versionText,
          source: "path",
        };
      }
    }
  } catch {
    // adb not on PATH
  }

  return { found: false, sdkPath };
}

async function readAdbVersion(runner: ProcessRunner, adbPath: string): Promise<string | undefined> {
  try {
    const result = await runner.run({ command: adbPath, args: ["version"] }, { timeoutMs: 10_000 });
    const text = `${result.stdout}\n${result.stderr}`.trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function isExecutableFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
