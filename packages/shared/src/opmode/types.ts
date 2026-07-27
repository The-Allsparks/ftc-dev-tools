import type { FriendlyError } from "../types/errors.js";

export type OpModeKind = "teleop" | "autonomous";
export type OpModeStyle = "linear" | "iterative";

export interface DetectedOpMode {
  className: string;
  kind?: OpModeKind;
  group?: string;
  relativePath: string;
  packageName?: string;
}

export interface OpModeListResult {
  projectRoot: string;
  teamCodeSourcePath?: string;
  opmodes: DetectedOpMode[];
  message: string;
  error?: FriendlyError;
}

export interface CreateOpModeOptionsInput {
  className: string;
  kind: OpModeKind;
  style?: OpModeStyle;
  group?: string;
  /** Java package under TeamCode (default org.firstinspires.ftc.teamcode). */
  packageName?: string;
  name?: string;
}

export interface CreateOpModeResult {
  success: boolean;
  dryRun: boolean;
  className: string;
  relativePath?: string;
  absolutePath?: string;
  message: string;
  backupDirectory?: string;
  error?: FriendlyError;
}
