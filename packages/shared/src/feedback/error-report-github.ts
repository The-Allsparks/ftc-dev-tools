import os from "node:os";
import type { FetchLike } from "../sdk/types.js";
import { PACKAGE_VERSION } from "../constants.js";
import { redactSecrets } from "../wifi/credentials.js";
import type { ErrorReportInput, ErrorReportSubmitResult } from "./error-report-types.js";
import { ERROR_REPORT_REPO_NAME, ERROR_REPORT_REPO_OWNER } from "./error-report-types.js";
import { buildOutboundGitHubErrorReport } from "./error-report-sanitize.js";
import {
  createGitHubIssue,
  createGitHubIssueComment,
  listOpenGitHubIssues,
} from "./github-error-report-http.js";
import { normalizeCommandAttempted } from "./error-report-title.js";

export { buildErrorReportIssueTitle, normalizeCommandAttempted } from "./error-report-title.js";

const MAX_TECHNICAL_CHARS = 8_000;
const DEFAULT_LABELS = ["bug"];

function redactReportText(text: string): string {
  const patterns = [
    /ghp_[A-Za-z0-9]{20,}/g,
    /github_pat_[A-Za-z0-9_]{20,}/g,
    /Bearer\s+[A-Za-z0-9._-]+/gi,
    /(password|passwd|token|api[_-]?key)\s*[:=]\s*\S+/gi,
  ];
  let out = text;
  for (const pattern of patterns) {
    out = out.replace(pattern, "$1=***");
  }
  return redactSecrets(out);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n\n… (truncated)`;
}

/** Rich local-only report body (not sent to GitHub — use buildOutboundGitHubErrorReport for upload). */
export function buildInitialErrorReportBody(input: ErrorReportInput): string {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const technical = input.error.technicalDetails
    ? truncate(redactReportText(input.error.technicalDetails), MAX_TECHNICAL_CHARS)
    : undefined;

  const parts = [
    "## Automated error report (local)",
    "",
    `**Command attempted:** \`${normalizeCommandAttempted(input.commandAttempted)}\``,
    `**Occurred (UTC):** ${occurredAt}`,
    "",
    "### Summary",
    "",
    redactReportText(input.error.summary),
    "",
    `- **Code:** \`${input.error.code}\``,
    `- **Title:** ${input.error.title}`,
  ];

  if (technical) {
    parts.push("", "### Technical details", "", "```", technical, "```");
  }

  return parts.join("\n");
}

/** @deprecated GitHub comments use buildOutboundGitHubErrorReport. */
export function buildErrorOccurrenceComment(input: ErrorReportInput): string {
  return buildOutboundGitHubErrorReport(input, "occurrence").bodyMarkdown;
}

export async function findOpenErrorReportIssueByTitle(
  title: string,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<{ number: number; title: string; state: string; html_url: string } | undefined> {
  const issues = await listOpenGitHubIssues(
    ERROR_REPORT_REPO_OWNER,
    ERROR_REPORT_REPO_NAME,
    options,
  );
  return issues.find((item) => item.title === title && item.state === "open");
}

export async function submitErrorReport(
  input: ErrorReportInput,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<ErrorReportSubmitResult> {
  const initial = buildOutboundGitHubErrorReport(input, "initial");
  const existing = await findOpenErrorReportIssueByTitle(initial.title, options);

  if (existing) {
    const occurrence = buildOutboundGitHubErrorReport(input, "occurrence");
    const comment = await createGitHubIssueComment(
      ERROR_REPORT_REPO_OWNER,
      ERROR_REPORT_REPO_NAME,
      existing.number,
      occurrence.bodyMarkdown,
      options,
    );
    return {
      action: "commented",
      issueNumber: existing.number,
      issueUrl: existing.html_url,
      commentUrl: comment.html_url,
    };
  }

  const issue = await createGitHubIssue(
    ERROR_REPORT_REPO_OWNER,
    ERROR_REPORT_REPO_NAME,
    {
      title: initial.title,
      bodyMarkdown: initial.bodyMarkdown,
      labels: DEFAULT_LABELS,
    },
    options,
  );
  return {
    action: "created",
    issueNumber: issue.number,
    issueUrl: issue.html_url,
  };
}

export function buildCliErrorReportEnvironment(): ErrorReportInput["environment"] {
  return {
    productVersion: PACKAGE_VERSION,
    surface: "cli",
    platform: process.platform,
    osRelease: os.release(),
    nodeVersion: process.version,
  };
}

export function buildMcpErrorReportEnvironment(): ErrorReportInput["environment"] {
  return {
    ...buildCliErrorReportEnvironment(),
    surface: "mcp",
  };
}

export function buildVscodeErrorReportEnvironment(
  extensionVersion: string,
): ErrorReportInput["environment"] {
  return {
    productVersion: extensionVersion.trim() || PACKAGE_VERSION,
    surface: "vscode",
    platform: process.platform,
    osRelease: os.release(),
    nodeVersion: process.version,
  };
}
