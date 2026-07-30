export type VisionPortalInitPattern = "builder" | "easyInitialize" | "unknown";

export type VisionPortalProcessorKind =
  "apriltag" | "color" | "tfod" | "custom" | "generic" | "unknown";

export type VisionPortalStreamFormat = "MJPEG" | "YUY2" | "RGB888" | "UNKNOWN" | string;

export interface VisionPortalProcessorSignal {
  variableName?: string;
  kind: VisionPortalProcessorKind;
  rawType?: string;
  evidence: string;
}

export interface VisionPortalConfigSignal {
  relativePath: string;
  className?: string;
  initPattern: VisionPortalInitPattern;
  cameraName?: string;
  resolution?: { width: number; height: number };
  streamFormat?: VisionPortalStreamFormat;
  processors: VisionPortalProcessorSignal[];
  evidence: string[];
}

export interface VisionPortalWorkspaceDiscovery {
  projectRoot: string;
  isOfficialFtcProject: boolean;
  robotConfigWebcams: string[];
  configs: VisionPortalConfigSignal[];
  visionPortalImportDetected: boolean;
  warnings: string[];
  requiresSelection: boolean;
  selectionReasons: string[];
  generatedAt: string;
}

export interface VisionPortalCapabilities {
  staticAnalysis: boolean;
  bridgeProcessorState: boolean;
  aprilTagResults: boolean;
  colorResults: boolean;
  customProcessorAdapters: boolean;
  cameraControls: boolean;
  streamingActions: boolean;
  processorToggle: boolean;
  multiCameraSwitch: boolean;
}

export interface VisionPortalStatusReport {
  projectRoot: string;
  discovery: VisionPortalWorkspaceDiscovery;
  capabilities: VisionPortalCapabilities;
  message: string;
  humanSummary: string[];
  generatedAt: string;
}

export interface VisionPortalAprilTagSummary {
  tagCount?: number;
  tagIds?: number[];
  raw: string;
}

export interface VisionPortalColorSummary {
  dominantColor?: string;
  sampleCount?: number;
  raw: string;
}

export interface VisionPortalNormalizedProcessorResult {
  kind: VisionPortalProcessorKind;
  summary?: string;
  aprilTag?: VisionPortalAprilTagSummary;
  color?: VisionPortalColorSummary;
  custom?: Record<string, unknown>;
}

export interface VisionPortalCustomProcessorAdapter {
  id: string;
  matches: (kind: VisionPortalProcessorKind, summary?: string) => boolean;
  normalize: (summary: string) => Record<string, unknown>;
}
