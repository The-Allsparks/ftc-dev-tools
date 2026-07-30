import type { VisionEndpointReachability } from "../endpoints/types.js";

export type ResolveDashboardUrlSource = "explicit" | "project-config" | "discovery";

export interface DashboardUrlCandidate {
  url: string;
  reachable: boolean;
  evidence: string;
}

export interface ResolveDashboardUrlReport {
  url?: string;
  source?: ResolveDashboardUrlSource;
  evidence?: string;
  candidates: DashboardUrlCandidate[];
  requiresSelection: boolean;
  message: string;
}

export interface ResolveDashboardUrlResult {
  url: string;
  source: ResolveDashboardUrlSource;
  evidence: string;
}

export interface FtcDashboardDependencyInfo {
  detected: boolean;
  version?: string;
  evidence?: string;
}

export interface FtcDashboardStatusReport {
  projectRoot: string;
  detected: boolean;
  dependency?: FtcDashboardDependencyInfo;
  url?: string;
  urlResolution: ResolveDashboardUrlReport;
  reachable?: VisionEndpointReachability;
  statusCode?: number;
  detectedServerVersion?: string;
  cameraStreamLikely: boolean;
  warnings: string[];
  humanSummary: string[];
  message: string;
  generatedAt: string;
}

export interface OpenFtcDashboardResult {
  url: string;
  opened: boolean;
  message: string;
}
