import type { FetchLike } from "../../sdk/types.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import type { VisionDiagnosticCode } from "./codes.js";

export type VisionDiagnosticSeverity = "info" | "warn" | "error";
export type VisionDiagnosticConfidence = "certain" | "likely";

export interface VisionDiagnostic {
  code: VisionDiagnosticCode;
  severity: VisionDiagnosticSeverity;
  confidence: VisionDiagnosticConfidence;
  title: string;
  summary: string;
  evidence: string[];
  suggestedActions: string[];
  docLink?: string;
  providerId?: string;
}

export interface VisionDiagnosticsSummary {
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

export interface VisionDiagnosticsCapabilities {
  liveImageHeuristics: boolean;
  logcatBridgeParsing: boolean;
  bundleExport: boolean;
  visionLabPanelIntegration: boolean;
}

export interface VisionDiagnosticsReport {
  projectRoot: string;
  generatedAt: string;
  probeNetwork: boolean;
  diagnostics: VisionDiagnostic[];
  summary: VisionDiagnosticsSummary;
  message: string;
  capabilities: VisionDiagnosticsCapabilities;
}

export interface CollectVisionDiagnosticsOptions {
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  platform?: NodeJS.Platform;
  fetchImpl?: FetchLike;
  /** When false, skip HTTP reachability probes. Default true when a device provider is present. */
  probeNetwork?: boolean;
}
