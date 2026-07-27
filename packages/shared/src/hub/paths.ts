import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function getHubUpdateCacheDir(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  if (platform === "win32") {
    const appData = env.APPDATA ?? path.join(home, "AppData", "Roaming");
    return path.join(appData, "ftc-dev-tools", "hub-updates");
  }
  const xdgCache = env.XDG_CACHE_HOME ?? path.join(home, ".cache");
  return path.join(xdgCache, "ftc-dev-tools", "hub-updates");
}

export async function ensureHubUpdateCacheDir(cacheDir?: string): Promise<string> {
  const resolved = cacheDir ?? getHubUpdateCacheDir();
  await fs.mkdir(resolved, { recursive: true });
  return resolved;
}

export function hubOsCacheFilePath(cacheDir: string, version: string, assetName: string): string {
  const safeVersion = version.replace(/[^\w.-]+/g, "_");
  return path.join(cacheDir, `chos-${safeVersion}`, assetName);
}
