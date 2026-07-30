import type { FriendlyError } from "../../types/errors.js";
import type { VisionBridgeTransport } from "./constants.js";

export type VisionCameraLifecycleState = "unknown" | "closed" | "opening" | "streaming" | "error";

export interface VisionDiagnosticCameraSnapshot {
  name?: string;
  state?: VisionCameraLifecycleState;
  width?: number;
  height?: number;
}

export interface VisionDiagnosticProcessorSnapshot {
  name: string;
  kind: string;
  enabled: boolean;
  summary?: string;
}

export interface VisionDiagnosticPayload {
  schemaVersion: string;
  sessionId: string;
  sequence: number;
  timestampMs: number;
  bridgeVersion: string;
  camera?: VisionDiagnosticCameraSnapshot;
  processors?: VisionDiagnosticProcessorSnapshot[];
  warnings?: string[];
}

export interface VisionDiagnosticValidationResult {
  valid: boolean;
  payload?: VisionDiagnosticPayload;
  errors: string[];
}

export interface VisionBridgeFileStatus {
  relativePath: string;
  present: boolean;
}

export interface VisionBridgeStatusReport {
  projectRoot: string;
  schemaVersion: string;
  bridgeCodeVersion: string;
  visionPortalDetected: boolean;
  ftcDashboardDetected: boolean;
  bridgeUtility: VisionBridgeFileStatus;
  diagnosticOpMode: VisionBridgeFileStatus;
  preferredTransports: VisionBridgeTransport[];
  capabilities: {
    scaffoldSupported: boolean;
    liveVisionPortalDiagnostics: boolean;
    ftcDashboardTelemetry: boolean;
  };
  warnings: string[];
  message: string;
  generatedAt: string;
}

export interface VisionBridgeScaffoldPlanEntry {
  relativePath: string;
  action: "add" | "skip" | "overwrite";
}

export interface VisionBridgeScaffoldResult {
  success: boolean;
  dryRun: boolean;
  plan: VisionBridgeScaffoldPlanEntry[];
  appliedPaths: string[];
  packageName: string;
  message: string;
  warnings: string[];
  error?: FriendlyError;
}
