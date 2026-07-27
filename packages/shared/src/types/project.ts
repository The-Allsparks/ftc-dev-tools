import type { CommandSpec } from "./process.js";

export interface FtcProjectInfo {
  rootDirectory: string;
  kind: "official-ftc" | "unknown";
  moduleName: string;
  hasGradleWrapper: boolean;
  gradleWrapperPath: string;
  settingsGradlePath?: string;
  buildGradlePath?: string;
  applicationId?: string;
  teamCodeSourcePath?: string;
}

export interface ProjectAdapter {
  detect(directory: string): Promise<boolean>;
  inspect(directory: string): Promise<FtcProjectInfo>;
  getBuildCommand(project: FtcProjectInfo): Promise<CommandSpec>;
  getCleanCommand(project: FtcProjectInfo): Promise<CommandSpec>;
  locateApk(project: FtcProjectInfo): Promise<string>;
  resolveApplicationId(project: FtcProjectInfo): Promise<string>;
}

export interface BuildResult {
  success: boolean;
  apkPath?: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface DeployResult {
  success: boolean;
  dryRun: boolean;
  deviceSerial?: string;
  apkPath?: string;
  applicationId?: string;
  durationMs: number;
  steps: string[];
  message: string;
}
