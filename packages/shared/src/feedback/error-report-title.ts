import { ERROR_REPORT_TITLE_PREFIX } from "./error-report-types.js";

export function normalizeCommandAttempted(commandAttempted: string): string {
  return commandAttempted.trim().replace(/\s+/g, " ");
}

export function buildErrorReportIssueTitle(
  commandAttempted: string,
  productVersion: string,
): string {
  const command = normalizeCommandAttempted(commandAttempted);
  const version = productVersion.trim() || "unknown";
  return `${ERROR_REPORT_TITLE_PREFIX} ${command} ${version}`;
}
