import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RobotInterfacePreference, WifiPreferenceFile } from "./types.js";

export function getWifiPreferencePath(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  if (platform === "win32") {
    const appData = env.APPDATA ?? path.join(home, "AppData", "Roaming");
    return path.join(appData, "ftc-dev-tools", "wifi.json");
  }
  const xdgConfig = env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  return path.join(xdgConfig, "ftc-dev-tools", "wifi.json");
}

export async function loadWifiPreference(
  preferencePath?: string,
): Promise<{ path: string; preference: WifiPreferenceFile }> {
  const resolved = preferencePath ?? getWifiPreferencePath();
  try {
    const text = await fs.readFile(resolved, "utf8");
    const parsed = JSON.parse(text) as WifiPreferenceFile;
    return { path: resolved, preference: parsed ?? {} };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { path: resolved, preference: {} };
    }
    throw error;
  }
}

export async function saveWifiPreference(
  preference: WifiPreferenceFile,
  preferencePath?: string,
): Promise<string> {
  const resolved = preferencePath ?? getWifiPreferencePath();
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(preference, null, 2)}\n`, "utf8");
  return resolved;
}

export async function setRobotNetworkInterface(
  iface: { name: string; index?: number },
  preferencePath?: string,
): Promise<RobotInterfacePreference> {
  const { path: resolved, preference } = await loadWifiPreference(preferencePath);
  const selected: RobotInterfacePreference = {
    name: iface.name,
    index: iface.index,
    selectedAt: new Date().toISOString(),
  };
  await saveWifiPreference(
    {
      ...preference,
      robotNetworkInterface: selected,
    },
    resolved,
  );
  return selected;
}

export async function recordManagedRoute(
  record: NonNullable<WifiPreferenceFile["managedRoutes"]>[number],
  preferencePath?: string,
): Promise<void> {
  const { path: resolved, preference } = await loadWifiPreference(preferencePath);
  const routes = [...(preference.managedRoutes ?? [])];
  const existingIdx = routes.findIndex((r) => r.destination === record.destination);
  if (existingIdx >= 0) {
    routes[existingIdx] = record;
  } else {
    routes.push(record);
  }
  await saveWifiPreference({ ...preference, managedRoutes: routes }, resolved);
}

export async function removeManagedRouteRecord(
  destination: string,
  preferencePath?: string,
): Promise<void> {
  const { path: resolved, preference } = await loadWifiPreference(preferencePath);
  const routes = (preference.managedRoutes ?? []).filter((r) => r.destination !== destination);
  await saveWifiPreference({ ...preference, managedRoutes: routes }, resolved);
}
