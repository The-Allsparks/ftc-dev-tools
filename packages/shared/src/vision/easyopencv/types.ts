export type EasyOpenCvFactoryPattern = "OpenCvWebcamFactory" | "phoneCamera" | "unknown";

export type EasyOpenCvDesktopReplayCompatibility = "likely" | "unlikely" | "unknown";

export interface EasyOpenCvDependencyInfo {
  detected: boolean;
  version?: string;
  evidence?: string;
}

export interface EasyOpenCvWebcamSignal {
  relativePath: string;
  className?: string;
  cameraName?: string;
  pipelineClassName?: string;
  pipelineVariable?: string;
  factoryPattern: EasyOpenCvFactoryPattern;
  dashboardStream: boolean;
  evidence: string[];
}

export interface EasyOpenCvPipelineSignal {
  relativePath: string;
  className: string;
  hasDashboardConfig: boolean;
  desktopReplayCompatible: EasyOpenCvDesktopReplayCompatibility;
  replayBlockers: string[];
  evidence: string[];
}

export interface EasyOpenCvSourceNavigationEntry {
  label: string;
  relativePath: string;
  kind: "pipeline" | "webcam-init";
}

export interface EasyOpenCvWorkspaceDiscovery {
  projectRoot: string;
  isOfficialFtcProject: boolean;
  gradleDependency: EasyOpenCvDependencyInfo;
  robotConfigWebcams: string[];
  webcams: EasyOpenCvWebcamSignal[];
  pipelines: EasyOpenCvPipelineSignal[];
  ftcDashboardDetected: boolean;
  easyOpenCvDetected: boolean;
  warnings: string[];
  requiresSelection: boolean;
  selectionReasons: string[];
  sourceNavigation: EasyOpenCvSourceNavigationEntry[];
  generatedAt: string;
}

export interface EasyOpenCvCapabilities {
  staticAnalysis: boolean;
  sourceNavigation: boolean;
  ftcDashboardStreaming: boolean;
  pipelineTemplates: boolean;
  diagnosticResultAdapter: boolean;
  desktopReplay: boolean;
  frameCapture: boolean;
  dashboardPipelineVariables: boolean;
}

export interface EasyOpenCvStatusReport {
  projectRoot: string;
  discovery: EasyOpenCvWorkspaceDiscovery;
  capabilities: EasyOpenCvCapabilities;
  message: string;
  humanSummary: string[];
  generatedAt: string;
}

export interface EasyOpenCvDiagnosticResult {
  pipelineClassName?: string;
  fps?: number;
  latencyMs?: number;
  summary?: string;
  raw: string;
}

export interface EasyOpenCvCustomDiagnosticAdapter {
  id: string;
  matches: (pipelineClassName: string | undefined, summary?: string) => boolean;
  normalize: (summary: string) => Record<string, unknown>;
}
