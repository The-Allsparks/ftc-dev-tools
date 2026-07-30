/** Normalized Limelight Vision provider types (VISION-04). */

export interface LimelightQuaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface LimelightDeviceStatus {
  host: string;
  apiBaseUrl: string;
  reachable: boolean;
  httpStatus?: number;
  deviceName?: string;
  pipelineIndex?: number;
  pipelineType?: string;
  fps?: number;
  cpuPercent?: number;
  ramPercent?: number;
  temperatureCelsius?: number;
  hardwareType?: number;
  snapshotMode?: number;
  ignoreNetworkTables?: boolean;
  cameraQuat?: LimelightQuaternion;
  raw?: Record<string, unknown>;
  fetchedAt: string;
  message: string;
}

export interface LimelightTargetSummary {
  valid: boolean;
  tx?: number;
  ty?: number;
  ta?: number;
  latencyPipelineMs?: number;
  latencyCaptureMs?: number;
  latencyTotalMs?: number;
  timestampMicros?: number;
  frameIndex?: number;
  pipelineIndex?: number;
  pipelineType?: string;
  crosshairColorBgr?: [number, number, number];
  classifierClass?: string;
  detectorClass?: string;
}

export interface LimelightTargetingResults {
  host: string;
  apiBaseUrl: string;
  reachable: boolean;
  httpStatus?: number;
  target: LimelightTargetSummary;
  /** Age of results relative to fetch time when timestamps are available. */
  updateAgeMs?: number;
  stale: boolean;
  raw?: Record<string, unknown>;
  fetchedAt: string;
  message: string;
}

export interface LimelightProviderCapabilities {
  readStatus: boolean;
  readResults: boolean;
  pipelineSwitch: boolean;
  pipelineReload: boolean;
  snapshotCapture: boolean;
  snapshotDelete: boolean;
}

export const LIMELIGHT_READ_ONLY_CAPABILITIES: LimelightProviderCapabilities = {
  readStatus: true,
  readResults: true,
  pipelineSwitch: false,
  pipelineReload: false,
  snapshotCapture: false,
  snapshotDelete: false,
};

export interface ResolveLimelightHostResult {
  host: string;
  source: "explicit" | "project-config" | "discovery";
  evidence: string;
}

export interface ResolveLimelightHostReport {
  host?: string;
  source?: ResolveLimelightHostResult["source"];
  evidence?: string;
  candidates: Array<{ host: string; reachable: boolean; evidence: string }>;
  requiresSelection: boolean;
  message: string;
}
