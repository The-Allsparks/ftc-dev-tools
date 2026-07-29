import type { MachineInstallNeeds } from "@ftc-dev-tools/shared";

const TTL_MS = 5 * 60 * 1000;

let cached: { cwd: string; at: number; needs: MachineInstallNeeds } | undefined;

export function cacheMachineInstallNeeds(cwd: string, needs: MachineInstallNeeds): void {
  cached = { cwd: normalizeCwd(cwd), at: Date.now(), needs };
}

export function getCachedMachineInstallNeeds(cwd: string): MachineInstallNeeds | undefined {
  if (!cached) {
    return undefined;
  }
  if (Date.now() - cached.at > TTL_MS) {
    cached = undefined;
    return undefined;
  }
  if (normalizeCwd(cwd) !== cached.cwd) {
    return undefined;
  }
  return cached.needs;
}

export function clearMachineInstallNeedsCache(): void {
  cached = undefined;
}

function normalizeCwd(cwd: string): string {
  return cwd.replace(/\\/g, "/").replace(/\/+$/, "") || "/";
}
