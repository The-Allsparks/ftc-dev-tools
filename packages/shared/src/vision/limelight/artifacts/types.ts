/** Limelight Vision pipeline-as-code artifact types (VISION-05). */

export type LimelightArtifactKind = "pipeline" | "python-script" | "field-map" | "manifest";

export interface LimelightPipelineArtifact {
  kind: "pipeline";
  slot?: number;
  name?: string;
  relativePath: string;
  absolutePath: string;
}

export interface LimelightPythonArtifact {
  kind: "python-script";
  index?: number;
  relativePath: string;
  absolutePath: string;
}

export interface LimelightFieldMapArtifact {
  kind: "field-map";
  index?: number;
  relativePath: string;
  absolutePath: string;
}

export type LimelightArtifact =
  | LimelightPipelineArtifact
  | LimelightPythonArtifact
  | LimelightFieldMapArtifact;

export interface LimelightArtifactManifest {
  version: string;
  pipelineDirectory: string;
  manifestPath?: string;
  pipelines: LimelightPipelineArtifact[];
  pythonScripts: LimelightPythonArtifact[];
  fieldMaps: LimelightFieldMapArtifact[];
  warnings: string[];
  generatedAt: string;
}

export interface LimelightArtifactValidationIssue {
  severity: "error" | "warning";
  relativePath: string;
  message: string;
}

export interface LimelightArtifactValidationReport {
  pipelineDirectory: string;
  issues: LimelightArtifactValidationIssue[];
  validCount: number;
  errorCount: number;
  warningCount: number;
  success: boolean;
  message: string;
  generatedAt: string;
}

export interface LimelightJsonDiffEntry {
  path: string;
  kind: "added" | "removed" | "changed";
  workspaceValue?: unknown;
  cameraValue?: unknown;
}

export interface LimelightPipelineDiffReport {
  host: string;
  slot: number;
  workspacePath?: string;
  identical: boolean;
  diffEntries: LimelightJsonDiffEntry[];
  humanSummary: string[];
  workspaceJson?: Record<string, unknown>;
  cameraJson?: Record<string, unknown>;
  message: string;
  generatedAt: string;
}
