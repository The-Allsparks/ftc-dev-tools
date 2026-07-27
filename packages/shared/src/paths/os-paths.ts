import os from "node:os";
import path from "node:path";

export type SupportedPlatform = "win32" | "darwin" | "linux" | "unsupported";

export function detectPlatform(platform: NodeJS.Platform = process.platform): SupportedPlatform {
  if (platform === "win32" || platform === "darwin" || platform === "linux") {
    return platform;
  }
  return "unsupported";
}

export function isSupportedPlatform(platform: NodeJS.Platform = process.platform): boolean {
  return detectPlatform(platform) !== "unsupported";
}

export function gradleWrapperName(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "gradlew.bat" : "gradlew";
}

export function pathExistsJoin(...parts: string[]): string {
  return path.join(...parts);
}

export function expandHome(input: string, home: string = os.homedir()): string {
  if (input === "~") {
    return home;
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(home, input.slice(2));
  }
  return input;
}

export function commonAndroidSdkCandidates(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string[] {
  const fromEnv = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => expandHome(value.trim(), home));

  const locals: string[] = [];
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    locals.push(path.join(localAppData, "Android", "Sdk"));
  } else if (platform === "darwin") {
    locals.push(path.join(home, "Library", "Android", "sdk"));
    locals.push(path.join(home, "Android", "Sdk"));
  } else {
    locals.push(path.join(home, "Android", "Sdk"));
    locals.push(path.join(home, "Android", "sdk"));
  }

  return uniquePreserveOrder([...fromEnv, ...locals]);
}

export function adbExecutableName(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "adb.exe" : "adb";
}

export function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = process.platform === "win32" ? value.toLowerCase() : value;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}
