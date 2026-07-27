import type { FriendlyError } from "../types/errors.js";
import type { AndroidDevice } from "../types/device.js";
import type { FetchLike } from "../sdk/types.js";

export type HubOsFreshness = "up-to-date" | "behind" | "ahead" | "unknown";

export type HubUpdateConnection = "usb" | "wifi-adb" | "none" | "unknown";

export interface HubOsRelease {
  version: string;
  tag: string;
  downloadUrl: string;
  changelogUrl: string;
  assetName: string;
}

export interface HubDeviceInfo {
  serial?: string;
  model?: string;
  manufacturer?: string;
  connection: HubUpdateConnection;
  controlHubLikelihood?: AndroidDevice["controlHubLikelihood"];
  /** Control Hub OS version when readable (adb props and/or RC console). */
  osVersion?: string;
  osVersionSources: string[];
  /** Robot Controller app versionName when readable. */
  robotControllerVersion?: string;
  rawProperties: Record<string, string>;
}

export interface HubStatusReport {
  device?: HubDeviceInfo;
  consoleReachable: boolean;
  consoleUrl: string;
  message: string;
  generatedAt: string;
  warnings: string[];
  error?: FriendlyError;
}

export interface HubUpdateCheckReport {
  localOsVersion?: string;
  remote?: HubOsRelease;
  freshness: HubOsFreshness;
  message: string;
  generatedAt: string;
  catalogSourceUrl: string;
  error?: FriendlyError;
}

export interface HubDownloadResult {
  success: boolean;
  dryRun: boolean;
  release?: HubOsRelease;
  filePath?: string;
  bytesWritten?: number;
  alreadyPresent?: boolean;
  message: string;
  error?: FriendlyError;
}

export type HubApplyMode = "guided" | "upload-attempt";

export interface HubApplyResult {
  success: boolean;
  dryRun: boolean;
  mode: HubApplyMode;
  filePath?: string;
  release?: HubOsRelease;
  attemptedEndpoints: string[];
  openedConsole: boolean;
  planLines: string[];
  message: string;
  error?: FriendlyError;
}

export type { FetchLike };
