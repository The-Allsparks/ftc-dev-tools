import type { FriendlyError } from "../types/errors.js";
import type { ErrorReportEnvironment, ErrorReportInput } from "./error-report-types.js";
import { listErrorRuleCodes } from "../errors/interpret.js";
import { PACKAGE_VERSION } from "../constants.js";
import { buildErrorReportIssueTitle, normalizeCommandAttempted } from "./error-report-title.js";

const KNOWN_ERROR_CODES = new Set([
  ...listErrorRuleCodes(),
  "UNKNOWN_ERROR",
  "GITHUB_ERROR_REPORT_FAILED",
]);
const ALLOWED_SURFACES = new Set(["vscode", "cli", "mcp"]);

export function normalizeOutboundErrorCode(raw: string): string {
  const code = raw.trim();
  return KNOWN_ERROR_CODES.has(code) ? code : "UNKNOWN_ERROR";
}

function normalizeProductVersion(raw: string): string {
  const match = raw.trim().match(/^\d+\.\d+\.\d+/);
  return match?.[0] ?? PACKAGE_VERSION;
}

function normalizeSurface(raw: string): ErrorReportEnvironment["surface"] {
  return ALLOWED_SURFACES.has(raw) ? (raw as ErrorReportEnvironment["surface"]) : "cli";
}

function normalizePlatform(raw: string): string {
  const platform = raw.trim().slice(0, 32);
  return platform || "unknown";
}

function normalizeReporterLogin(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const login = raw
    .trim()
    .replace(/[^\w-]/g, "")
    .slice(0, 39);
  return login || undefined;
}

export interface OutboundGitHubErrorReport {
  title: string;
  bodyMarkdown: string;
}

function buildOutboundBody(fields: {
  kind: "initial" | "occurrence";
  commandAttempted: string;
  errorCode: string;
  productVersion: string;
  surface: ErrorReportEnvironment["surface"];
  platform: string;
  occurredAt: string;
  reporterLogin?: string;
}): string {
  const lines = [
    fields.kind === "initial" ? "## Automated error report" : "### Occurrence report",
    "",
    `**Command attempted:** \`${fields.commandAttempted}\``,
    fields.reporterLogin ? `**Reporter:** @${fields.reporterLogin}` : "",
    `**Occurred (UTC):** ${fields.occurredAt}`,
    `**Error code:** \`${fields.errorCode}\``,
    `**Product version:** ${fields.productVersion}`,
    `**Surface:** ${fields.surface}`,
    `**Platform:** ${fields.platform}`,
    "",
    "Full diagnostics (build logs, config paths, secrets) stay on your machine. This report only includes the fields above.",
    "",
    "---",
    fields.kind === "initial"
      ? "_Submitted by FTC Dev Tools error reporting._"
      : "_Another occurrence via FTC Dev Tools._",
  ].filter((line) => line !== "");

  return lines.join("\n");
}

/** Whitelist-only GitHub payload — no raw error text or config-derived content. */
export function buildOutboundGitHubErrorReport(
  input: ErrorReportInput,
  kind: "initial" | "occurrence",
): OutboundGitHubErrorReport {
  const commandAttempted = normalizeCommandAttempted(input.commandAttempted).replace(
    /[^\w.:+-]/g,
    "",
  );
  const errorCode = normalizeOutboundErrorCode(input.error.code);
  const productVersion = normalizeProductVersion(input.environment.productVersion);
  const surface = normalizeSurface(input.environment.surface);
  const platform = normalizePlatform(input.environment.platform);
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const reporterLogin = normalizeReporterLogin(input.reporterLogin);

  const title = buildErrorReportIssueTitle(commandAttempted, productVersion);
  const bodyMarkdown = buildOutboundBody({
    kind,
    commandAttempted,
    errorCode,
    productVersion,
    surface,
    platform,
    occurredAt,
    reporterLogin,
  });

  return { title, bodyMarkdown };
}

/** @deprecated retained for compatibility; GitHub upload uses buildOutboundGitHubErrorReport. */
export function sanitizeErrorReportInput(input: ErrorReportInput): ErrorReportInput {
  const error: FriendlyError = {
    code: normalizeOutboundErrorCode(input.error.code),
    title: "Redacted",
    summary: "Redacted",
    suggestedActions: [],
  };
  return {
    commandAttempted: normalizeCommandAttempted(input.commandAttempted),
    occurredAt: input.occurredAt,
    environment: {
      productVersion: normalizeProductVersion(input.environment.productVersion),
      surface: normalizeSurface(input.environment.surface),
      platform: normalizePlatform(input.environment.platform),
      nodeVersion: input.environment.nodeVersion,
      osRelease: input.environment.osRelease,
    },
    reporterLogin: normalizeReporterLogin(input.reporterLogin),
    error,
  };
}
