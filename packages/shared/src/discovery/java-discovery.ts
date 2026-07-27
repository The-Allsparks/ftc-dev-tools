import type { ProcessRunner } from "../types/process.js";

export interface JavaDiscoveryResult {
  found: boolean;
  versionText?: string;
  majorVersion?: number;
  javaHome?: string;
}

export async function discoverJava(
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
): Promise<JavaDiscoveryResult> {
  const javaHome = env.JAVA_HOME?.trim() || undefined;
  try {
    const result = await runner.run({ command: "java", args: ["-version"] }, { timeoutMs: 15_000 });
    // java -version writes to stderr by convention
    const versionText = `${result.stderr}\n${result.stdout}`.trim();
    if (result.exitCode !== 0 && !versionText) {
      return { found: false, javaHome };
    }
    return {
      found: true,
      versionText: versionText || undefined,
      majorVersion: parseJavaMajorVersion(versionText),
      javaHome,
    };
  } catch {
    return { found: false, javaHome };
  }
}

export function parseJavaMajorVersion(versionText: string): number | undefined {
  const match =
    versionText.match(/version\s+"(\d+)(?:\.\d+)*"/i) ??
    versionText.match(/version\s+(\d+)(?:\.\d+)*/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1] ?? "", 10);
}
