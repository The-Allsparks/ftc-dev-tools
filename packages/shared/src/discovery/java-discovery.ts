import type { ProcessRunner } from "../types/process.js";
import { REQUIRED_JDK_MAJOR } from "../constants.js";
import { findJdkHomeForMajor } from "./java-home.js";
import path from "node:path";

export interface JavaDiscoveryResult {
  found: boolean;
  versionText?: string;
  majorVersion?: number;
  javaHome?: string;
  /** When set, `java` on PATH differs from the JDK FTC Dev Tools selects for builds. */
  pathMajorVersion?: number;
  selectedJavaHome?: string;
}

async function runJavaVersion(
  runner: ProcessRunner,
  command: string,
): Promise<{ versionText?: string; majorVersion?: number }> {
  const result = await runner.run({ command, args: ["-version"] }, { timeoutMs: 15_000 });
  const versionText = `${result.stderr}\n${result.stdout}`.trim();
  if (result.exitCode !== 0 && !versionText) {
    return {};
  }
  return {
    versionText: versionText || undefined,
    majorVersion: versionText ? parseJavaMajorVersion(versionText) : undefined,
  };
}

export async function discoverJava(
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
): Promise<JavaDiscoveryResult> {
  const platform = process.platform;
  const pathJava = await runJavaVersion(runner, "java");
  const selectedHome = await findJdkHomeForMajor(REQUIRED_JDK_MAJOR, runner, env, platform);

  if (selectedHome) {
    const javaExe = path.join(selectedHome, "bin", platform === "win32" ? "java.exe" : "java");
    const selected = await runJavaVersion(runner, javaExe);
    if (selected.majorVersion !== undefined) {
      return {
        found: true,
        versionText: selected.versionText,
        majorVersion: selected.majorVersion,
        javaHome: selectedHome,
        selectedJavaHome: selectedHome,
        pathMajorVersion: pathJava.majorVersion,
      };
    }
  }

  if (pathJava.versionText || pathJava.majorVersion !== undefined) {
    return {
      found: true,
      versionText: pathJava.versionText,
      majorVersion: pathJava.majorVersion,
      javaHome: env.JAVA_HOME?.trim() || undefined,
      pathMajorVersion: pathJava.majorVersion,
    };
  }

  return {
    found: false,
    javaHome: env.JAVA_HOME?.trim() || undefined,
  };
}

export function suggestFtcJavaHomeSetting(
  java: JavaDiscoveryResult,
  currentSetting?: string,
): string | undefined {
  if (currentSetting?.trim()) {
    return undefined;
  }
  if (java.majorVersion !== REQUIRED_JDK_MAJOR || !java.selectedJavaHome) {
    return undefined;
  }
  if (java.pathMajorVersion === undefined || java.pathMajorVersion === java.majorVersion) {
    return undefined;
  }
  return java.selectedJavaHome;
}

export function parseJavaMajorVersion(versionText: string): number | undefined {
  const legacyQuoted = versionText.match(/version\s+"1\.(\d+)/i);
  if (legacyQuoted) {
    return Number.parseInt(legacyQuoted[1] ?? "", 10);
  }
  const match =
    versionText.match(/version\s+"(\d+)(?:\.\d+)*"/i) ??
    versionText.match(/version\s+(\d+)(?:\.\d+)*/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1] ?? "", 10);
}
