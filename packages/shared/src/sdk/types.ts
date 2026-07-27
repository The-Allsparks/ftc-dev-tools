import type { FriendlyError } from "../types/errors.js";

export type SdkFreshness = "up-to-date" | "behind" | "ahead" | "unknown";

export interface LocalSdkInfo {
  version?: string;
  artifacts: Array<{ name: string; version: string }>;
  mismatchedVersions: boolean;
  dependenciesPath?: string;
  manifestVersionName?: string;
  manifestVersionCode?: string;
}

export interface RemoteSdkRelease {
  tagName: string;
  version: string;
  name: string;
  htmlUrl: string;
  zipballUrl: string;
  publishedAt?: string;
  draft: boolean;
  prerelease: boolean;
}

export interface SdkStatusReport {
  local: LocalSdkInfo;
  remote?: RemoteSdkRelease;
  freshness: SdkFreshness;
  message: string;
  generatedAt: string;
  error?: FriendlyError;
}

export interface SdkUpdatePlanEntry {
  relativePath: string;
  action: "add" | "overwrite" | "unchanged";
}

export interface SdkUpdatePlan {
  projectRoot: string;
  sourceRoot: string;
  targetVersion: string;
  targetTag: string;
  entries: SdkUpdatePlanEntry[];
  teamCodePreserved: true;
  warnings: string[];
}

export interface SdkUpdateResult {
  success: boolean;
  dryRun: boolean;
  plan?: SdkUpdatePlan;
  backupDirectory?: string;
  appliedPaths: string[];
  message: string;
  error?: FriendlyError;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | ArrayBuffer | Uint8Array;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;
