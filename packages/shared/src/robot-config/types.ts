import type { FriendlyError } from "../types/errors.js";

export interface RobotConfigDevice {
  type: string;
  name: string;
  port?: string;
  parentPath: string[];
}

export interface RobotConfigInfo {
  name: string;
  relativePath: string;
  absolutePath: string;
  source: "project-res-xml";
  deviceCount: number;
}

export interface RobotConfigDetail extends RobotConfigInfo {
  rootType?: string;
  devices: RobotConfigDevice[];
  rawXml?: string;
}

export interface RobotConfigListResult {
  projectRoot: string;
  resXmlPath?: string;
  configs: RobotConfigInfo[];
  message: string;
  error?: FriendlyError;
}

export interface RobotConfigShowResult {
  success: boolean;
  config?: RobotConfigDetail;
  message: string;
  error?: FriendlyError;
}

export interface RobotConfigValidationIssue {
  severity: "error" | "warning";
  message: string;
}

export interface RobotConfigValidateResult {
  success: boolean;
  configName?: string;
  path?: string;
  issues: RobotConfigValidationIssue[];
  message: string;
  error?: FriendlyError;
}

export interface RobotConfigPullResult {
  success: boolean;
  dryRun: boolean;
  deviceSerial?: string;
  plannedFiles: string[];
  pulledFiles: string[];
  destDir?: string;
  message: string;
  error?: FriendlyError;
}
