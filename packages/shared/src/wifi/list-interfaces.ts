import type { ProcessRunner } from "../types/process.js";
import type { NetworkInterfaceInfo } from "./types.js";

export interface ListInterfacesOptions {
  runner: ProcessRunner;
  platform?: NodeJS.Platform;
}

export async function listNetworkInterfaces(
  options: ListInterfacesOptions,
): Promise<NetworkInterfaceInfo[]> {
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    return listWindowsInterfaces(options.runner);
  }
  return listUnixInterfaces(options.runner);
}

async function listWindowsInterfaces(runner: ProcessRunner): Promise<NetworkInterfaceInfo[]> {
  const result = await runner.run({
    command: "netsh",
    args: ["interface", "ipv4", "show", "interfaces"],
  });
  if (result.exitCode !== 0) {
    throw Object.assign(new Error("Failed to list network interfaces via netsh."), {
      code: "WIFI_INTERFACE_NOT_FOUND",
      technicalDetails: result.stderr || result.stdout,
    });
  }
  return parseNetshInterfacesOutput(result.stdout);
}

export function parseNetshInterfacesOutput(stdout: string): NetworkInterfaceInfo[] {
  const lines = stdout.split(/\r?\n/);
  const interfaces: NetworkInterfaceInfo[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Idx") || trimmed.startsWith("---")) {
      continue;
    }
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) {
      continue;
    }
    const index = Number.parseInt(match[1] ?? "0", 10);
    const metric = Number.parseInt(match[2] ?? "", 10);
    const stateToken = (match[4] ?? "").toLowerCase();
    const name = (match[5] ?? "").trim();
    interfaces.push({
      name,
      index,
      metric: Number.isFinite(metric) ? metric : undefined,
      state: stateToken === "connected" ? "up" : stateToken === "disconnected" ? "down" : "unknown",
      ipv4Addresses: [],
    });
  }
  return interfaces;
}

async function listUnixInterfaces(runner: ProcessRunner): Promise<NetworkInterfaceInfo[]> {
  const linkResult = await runner.run({ command: "ip", args: ["-o", "link", "show"] });
  if (linkResult.exitCode !== 0) {
    throw Object.assign(new Error("Failed to list network interfaces via ip."), {
      code: "WIFI_INTERFACE_NOT_FOUND",
      technicalDetails: linkResult.stderr || linkResult.stdout,
    });
  }
  const addrResult = await runner.run({ command: "ip", args: ["-o", "-4", "addr", "show"] });
  const addresses = parseIpAddrOutput(addrResult.stdout);
  return parseIpLinkOutput(linkResult.stdout, addresses);
}

export function parseIpLinkOutput(
  stdout: string,
  addresses: Map<string, string[]> = new Map(),
): NetworkInterfaceInfo[] {
  const interfaces: NetworkInterfaceInfo[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\d+:\s+([^:]+):\s+<([^>]+)>/);
    if (!match) {
      continue;
    }
    const name = match[1]?.trim();
    if (!name) {
      continue;
    }
    const flags = match[2] ?? "";
    interfaces.push({
      name,
      state: flags.includes("UP") ? "up" : "down",
      ipv4Addresses: addresses.get(name) ?? [],
    });
  }
  return interfaces;
}

export function parseIpAddrOutput(stdout: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\d+:\s+(\S+)\s+inet\s+([0-9.]+)/);
    if (!match) {
      continue;
    }
    const name = match[1]?.replace(/:$/, "") ?? "";
    const ip = match[2] ?? "";
    const list = map.get(name) ?? [];
    list.push(ip);
    map.set(name, list);
  }
  return map;
}

export function findInterfaceByNameOrIndex(
  interfaces: NetworkInterfaceInfo[],
  selector: string,
): NetworkInterfaceInfo | undefined {
  const asIndex = Number.parseInt(selector, 10);
  if (Number.isFinite(asIndex)) {
    return interfaces.find((iface) => iface.index === asIndex);
  }
  const lower = selector.toLowerCase();
  return interfaces.find((iface) => iface.name.toLowerCase() === lower);
}
