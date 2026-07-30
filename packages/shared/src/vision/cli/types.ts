import type { VisionCliExitCode } from "./constants.js";

export type VisionCliProviderId =
  | "vision:limelight"
  | "telemetry:ftc-dashboard"
  | "vision:visionportal"
  | "vision:easyopencv"
  | "auto";

export interface VisionCliCommonOptions {
  provider?: VisionCliProviderId | string;
  endpoint?: string;
  host?: string;
  url?: string;
  device?: string;
  timeoutMs?: number;
  redact?: boolean;
  json?: boolean;
  probeNetwork?: boolean;
}

export interface VisionCliCatalogEntry {
  command: string;
  summary: string;
  available: boolean;
  deferredReason?: string;
  mutating: boolean;
  equivalent?: string;
}

export interface VisionCliDeferredResult {
  command: string;
  deferred: true;
  message: string;
  exitCode: VisionCliExitCode;
  followUp?: string[];
}

export interface OpenVisionTargetResult {
  providerId: string;
  url: string;
  opened: boolean;
  message: string;
}

export interface VisionCliJsonEnvelope<T> {
  schemaVersion: string;
  command: string;
  generatedAt: string;
  redacted: boolean;
  data: T;
}
