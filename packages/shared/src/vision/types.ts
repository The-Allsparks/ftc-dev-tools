/** Vision Lab workspace discovery types (VISION-02). */

import type { FtcDevVisionConfig } from "../types/config.js";

export type { FtcDevVisionConfig, FtcDevLimelightConfig } from "../types/config.js";

export type VisionDetectionKind =
  "visionportal" | "easyopencv" | "limelight" | "ftc-dashboard" | "unknown";

export interface VisionWorkspaceSignal {
  kind: VisionDetectionKind;
  /** Suggested provider id from registry */
  suggestedProviderId: string;
  /** Human-readable evidence, e.g. import or dependency */
  evidence: string;
  /** Optional path relative to project root */
  relativePath?: string;
}

export interface VisionPipelineDirectory {
  relativePath: string;
  fileCount: number;
}

export interface VisionWorkspaceDiscovery {
  projectRoot: string;
  isOfficialFtcProject: boolean;
  teamCodeSourcePath?: string;
  signals: VisionWorkspaceSignal[];
  pipelineDirectories: VisionPipelineDirectory[];
  suggestedDefaultProviderId?: string;
  warnings: string[];
  generatedAt: string;
}

export interface VisionStatusReport {
  projectRoot: string;
  config: FtcDevVisionConfig;
  configPath?: string;
  configWarnings: string[];
  configErrors: string[];
  discovery: VisionWorkspaceDiscovery;
  message: string;
  generatedAt: string;
}
