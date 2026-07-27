import type { FriendlyError } from "../types/errors.js";
import type { FetchLike } from "../sdk/types.js";

export interface PedroDependencyInfo {
  group: string;
  name: string;
  version: string;
  present: boolean;
}

export interface PedroStatusReport {
  projectRoot: string;
  dependenciesPath?: string;
  teamCodeSourcePath?: string;
  pedroPathingPackagePresent: boolean;
  pedroPathingPackagePath?: string;
  byalazarRepoPresent: boolean;
  dependencies: PedroDependencyInfo[];
  ftcVersion?: string;
  compileSdk?: number;
  compileSdkOk: boolean;
  message: string;
  warnings: string[];
  generatedAt: string;
  error?: FriendlyError;
}

export interface PedroAddPlanEntry {
  kind: "repo" | "dependency" | "compileSdk";
  description: string;
  detail?: string;
}

export interface PedroAddResult {
  success: boolean;
  dryRun: boolean;
  plan: PedroAddPlanEntry[];
  ftcVersion?: string;
  backupDirectory?: string;
  message: string;
  warnings: string[];
  error?: FriendlyError;
}

export interface PedroScaffoldPlanEntry {
  relativePath: string;
  action: "add" | "overwrite" | "unchanged";
}

export interface PedroScaffoldResult {
  success: boolean;
  dryRun: boolean;
  plan: PedroScaffoldPlanEntry[];
  appliedPaths: string[];
  backupDirectory?: string;
  sourceTag?: string;
  message: string;
  warnings: string[];
  error?: FriendlyError;
}

export type { FetchLike };
