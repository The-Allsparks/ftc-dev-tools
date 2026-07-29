import type { FriendlyError } from "../types/errors.js";

export const ERROR_REPORT_REPO_OWNER = "The-Allsparks";
export const ERROR_REPORT_REPO_NAME = "ftc-dev-tools";
export const ERROR_REPORT_TITLE_PREFIX = "[error]";

export type ErrorReportSurface = "vscode" | "cli" | "mcp";

export interface ErrorReportEnvironment {
  productVersion: string;
  surface: ErrorReportSurface;
  platform: string;
  osRelease?: string;
  nodeVersion?: string;
}

export interface ErrorReportInput {
  commandAttempted: string;
  error: FriendlyError;
  environment: ErrorReportEnvironment;
  reporterLogin?: string;
  deploySteps?: string[];
  occurredAt?: string;
}

export type ErrorReportSubmitAction = "created" | "commented" | "skipped";

export interface ErrorReportSubmitResult {
  action: ErrorReportSubmitAction;
  issueNumber?: number;
  issueUrl?: string;
  commentUrl?: string;
  reason?: string;
}
