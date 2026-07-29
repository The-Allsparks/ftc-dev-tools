import fs from "node:fs/promises";
import path from "node:path";
import pathWin32 from "node:path/win32";
import type { ProcessRunner } from "../types/process.js";
import { REQUIRED_JDK_MAJOR } from "../constants.js";
import { parseJavaMajorVersion } from "./java-discovery.js";

function pathForPlatform(platform: NodeJS.Platform): typeof path {
  return platform === "win32" ? pathWin32 : path;
}

function javaExecutableName(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "java.exe" : "java";
}

function javaBin(javaHome: string, platform: NodeJS.Platform = process.platform): string {
  return pathForPlatform(platform).join(javaHome, "bin", javaExecutableName(platform));
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJavaMajorFromHome(
  runner: ProcessRunner,
  javaHome: string,
  platform: NodeJS.Platform = process.platform,
): Promise<number | undefined> {
  const exe = javaBin(javaHome, platform);
  if (!(await pathExists(exe))) {
    return undefined;
  }
  try {
    const result = await runner.run({ command: exe, args: ["-version"] }, { timeoutMs: 15_000 });
    const versionText = `${result.stderr}\n${result.stdout}`.trim();
    if (!versionText) {
      return undefined;
    }
    return parseJavaMajorVersion(versionText);
  } catch {
    return undefined;
  }
}

async function newestMatchingDirectory(
  parent: string,
  prefix: string,
): Promise<string | undefined> {
  let entries: string[];
  try {
    entries = await fs.readdir(parent);
  } catch {
    return undefined;
  }
  const matches = entries
    .filter((name) => name.toLowerCase().startsWith(prefix.toLowerCase()))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const name of matches) {
    const full = path.join(parent, name);
    try {
      const stat = await fs.stat(full);
      if (stat.isDirectory()) {
        return full;
      }
    } catch {
      // skip
    }
  }
  return undefined;
}

async function findJdkHomeOnWindows(requiredMajor: number): Promise<string | undefined> {
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const prefixes = [
    { dir: path.join(programFiles, "Eclipse Adoptium"), prefix: `jdk-${requiredMajor}` },
    { dir: path.join(programFiles, "Java"), prefix: `jdk-${requiredMajor}` },
    { dir: path.join(programFiles, "Microsoft"), prefix: `jdk-${requiredMajor}` },
  ];
  for (const { dir, prefix } of prefixes) {
    const match = await newestMatchingDirectory(dir, prefix);
    if (match) {
      return match;
    }
  }
  return undefined;
}

async function findJdkHomeOnLinux(requiredMajor: number): Promise<string | undefined> {
  const names = [
    `java-${requiredMajor}-openjdk-amd64`,
    `java-${requiredMajor}-openjdk`,
    `temurin-${requiredMajor}-jdk-amd64`,
    `jdk-${requiredMajor}`,
  ];
  for (const name of names) {
    const full = path.join("/usr/lib/jvm", name);
    if (await pathExists(javaBin(full, "linux"))) {
      return full;
    }
  }
  return undefined;
}

async function findJdkHomeViaMacJavaHome(
  runner: ProcessRunner,
  requiredMajor: number,
): Promise<string | undefined> {
  try {
    const result = await runner.run(
      {
        command: "/usr/libexec/java_home",
        args: ["-v", String(requiredMajor)],
      },
      { timeoutMs: 10_000 },
    );
    const home = result.stdout.trim();
    if (result.exitCode === 0 && home) {
      return home;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function configuredJavaHomeCandidates(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates: string[] = [];
  const ftc = env.FTC_JAVA_HOME?.trim();
  const javaHome = env.JAVA_HOME?.trim();
  if (ftc) {
    candidates.push(ftc);
  }
  if (javaHome && javaHome !== ftc) {
    candidates.push(javaHome);
  }
  return candidates;
}

/**
 * Locate a JDK install for the required major version (FTC: 17), even when `java` on PATH is older.
 */
export async function findJdkHomeForMajor(
  requiredMajor: number,
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<string | undefined> {
  for (const home of configuredJavaHomeCandidates(env)) {
    const major = await readJavaMajorFromHome(runner, home, platform);
    if (major === requiredMajor) {
      return path.resolve(home);
    }
  }

  let scanned: string | undefined;
  if (platform === "win32") {
    scanned = await findJdkHomeOnWindows(requiredMajor);
  } else if (platform === "darwin") {
    scanned = await findJdkHomeViaMacJavaHome(runner, requiredMajor);
  } else {
    scanned = await findJdkHomeOnLinux(requiredMajor);
  }

  if (scanned) {
    const major = await readJavaMajorFromHome(runner, scanned, platform);
    if (major === requiredMajor) {
      return path.resolve(scanned);
    }
  }

  return undefined;
}

/** Env vars so Gradle and child processes use the chosen JDK (prepends `bin` to PATH). */
export function buildJavaEnvForHome(
  javaHome: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Record<string, string> {
  const pathOs = pathForPlatform(platform);
  const bin = pathOs.join(javaHome, "bin");
  const pathKey = platform === "win32" ? "Path" : "PATH";
  const existingPath = env[pathKey] ?? env.PATH ?? "";
  const mergedPath = existingPath.includes(bin)
    ? existingPath
    : `${bin}${pathOs.delimiter}${existingPath}`;
  return {
    JAVA_HOME: javaHome,
    [pathKey]: mergedPath,
  };
}

export async function resolveJdkEnvForFtcBuild(
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
  requiredMajor: number = REQUIRED_JDK_MAJOR,
): Promise<Record<string, string> | undefined> {
  const home = await findJdkHomeForMajor(requiredMajor, runner, env);
  if (!home) {
    return undefined;
  }
  return buildJavaEnvForHome(home, env);
}
