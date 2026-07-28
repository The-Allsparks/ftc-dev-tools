import type { ProcessRunner } from "../types/process.js";

export interface FtcCliDiscoveryResult {
  found: boolean;
  ftcPath?: string;
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
        return { found: true, ftcPath };
      }
    }
  } catch {
    // ftc not on PATH
  }
  return { found: false };
}
