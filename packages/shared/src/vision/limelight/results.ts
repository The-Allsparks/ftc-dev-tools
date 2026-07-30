import { limelightApiBaseUrl } from "./constants.js";
import { limelightHttpGet } from "./client.js";
import { normalizeLimelightResults } from "./normalize.js";
import { resolveLimelightHost } from "./resolve-host.js";
import type { FetchLike } from "../../sdk/types.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import type { LimelightProviderCapabilities, LimelightTargetingResults } from "./types.js";
import { LIMELIGHT_READ_ONLY_CAPABILITIES } from "./types.js";

export interface GetLimelightResultsOptions {
  host?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
  staleThresholdMs?: number;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
}

export interface LimelightResultsReport extends LimelightTargetingResults {
  hostResolution: {
    source: "explicit" | "project-config" | "discovery";
    evidence: string;
  };
  capabilities: LimelightProviderCapabilities;
}

export async function getLimelightResults(
  projectRoot: string,
  options: GetLimelightResultsOptions = {},
): Promise<LimelightResultsReport> {
  const resolved = await resolveLimelightHost(projectRoot, {
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
  });

  const apiBaseUrl = limelightApiBaseUrl(resolved.host);
  const response = await limelightHttpGet<Record<string, unknown>>({
    host: resolved.host,
    path: "/results",
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
  });

  const base = normalizeLimelightResults(
    resolved.host,
    apiBaseUrl,
    response.data,
    response.status,
    response.ok,
    response.message,
    options.staleThresholdMs,
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
