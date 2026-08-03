import type { ProcessRunner } from "../types/process.js";

export interface FtcCliDiscoveryResult {
  found: boolean;
  ftcPath?: string;
  /** Semver from `ftc --version` when CLI is on PATH. */
  version?: string;
}

async function probeFtcCliVersion(
  runner: ProcessRunner,
  ftcPath: string,
): Promise<string | undefined> {
  try {
    const versionResult = await runner.run(
      { command: ftcPath, args: ["--version"] },
      { timeoutMs: 15_000 },
    );
    if (versionResult.exitCode === 0) {
      const match = versionResult.stdout.trim().match(/\d+\.\d+\.\d+/);
      return match?.[0];
    }
  } catch {
    // version probe failed
  }
  return undefined;
}

export async function discoverFtcCliOnPath(
  runner: ProcessRunner,
  platform: NodeJS.Platform = process.platform,
): Promise<FtcCliDiscoveryResult> {
  const whichCommand = platform === "win32" ? "where" : "which";
  try {
    const result = await runner.run(
      { command: whichCommand, args: ["ftc"] },
      { timeoutMs: 10_000 },
    );
    if (result.exitCode === 0) {
      const ftcPath = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      if (ftcPath) {
        const version = await probeFtcCliVersion(runner, ftcPath);
        return { found: true, ftcPath, version };
      }
    }
  } catch {
    // ftc not on PATH
  }
  return { found: false };
}
