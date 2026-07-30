import type { OpModeKind, OpModeStyle } from "../../opmode/types.js";
import type { FriendlyError } from "../../types/errors.js";
import type { ProcessRunner } from "../../types/process.js";
import type { VisionCodegenLanguage } from "./constants.js";

export type VisionCodegenKind =
  "easyopencv" | "visionportal-apriltag" | "visionportal-color" | "limelight" | "dashboard-stream";

export interface VisionCodegenKindDescriptor {
  kind: VisionCodegenKind;
  label: string;
  description: string;
  /** Full OpMode file(s); snippet-only kinds are documented separately. */
  generatesOpMode: boolean;
}

export interface VisionCodegenPlanEntry {
  relativePath: string;
  action: "add" | "skip" | "overwrite";
}

export interface VisionCodegenResult {
  success: boolean;
  dryRun: boolean;
  kind: VisionCodegenKind;
  language: VisionCodegenLanguage;
  plan: VisionCodegenPlanEntry[];
  appliedPaths: string[];
  packageName: string;
  className?: string;
  cameraName?: string;
  configName?: string;
  message: string;
  warnings: string[];
  sourcePreview?: string;
  error?: FriendlyError;
}

export interface ScaffoldVisionCodegenOptions {
  projectRoot: string;
  runner: ProcessRunner;
  kind: VisionCodegenKind;
  className: string;
  pipelineClassName?: string;
  packageName?: string;
  opModeKind?: OpModeKind;
  style?: OpModeStyle;
  group?: string;
  name?: string;
  cameraName?: string;
  configName?: string;
  limelightTableName?: string;
  useDashboardStream?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}
