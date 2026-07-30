import { limelightApiBaseUrl } from "./constants.js";
import { limelightHttpGet } from "./client.js";
import { normalizeLimelightStatus } from "./normalize.js";
import { resolveLimelightHost } from "./resolve-host.js";
import type { FetchLike } from "../../sdk/types.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import type { LimelightDeviceStatus, LimelightProviderCapabilities } from "./types.js";
import { LIMELIGHT_READ_ONLY_CAPABILITIES } from "./types.js";

export interface GetLimelightStatusOptions {
  host?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
}

export interface LimelightStatusReport extends LimelightDeviceStatus {
  hostResolution: {
    source: "explicit" | "project-config" | "discovery";
    evidence: string;
  };
  capabilities: LimelightProviderCapabilities;
}

export async function getLimelightStatus(
  projectRoot: string,
  options: GetLimelightStatusOptions = {},
): Promise<LimelightStatusReport> {
  const resolved = await resolveLimelightHost(projectRoot, {
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
  });

  const apiBaseUrl = limelightApiBaseUrl(resolved.host);
  const response = await limelightHttpGet<Record<string, unknown>>({
    host: resolved.host,
    path: "/status",
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
  });

  const base = normalizeLimelightStatus(
    resolved.host,
    apiBaseUrl,
    response.data,
    response.status,
    response.ok,
    response.message,
  );

  return {
    ...base,
    hostResolution: {
      source: resolved.source,
      evidence: resolved.evidence,
    },
    capabilities: LIMELIGHT_READ_ONLY_CAPABILITIES,
  };
}
