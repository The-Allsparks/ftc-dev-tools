import os from "node:os";
import type { FetchLike } from "../sdk/types.js";
import { PACKAGE_VERSION } from "../constants.js";
import { redactSecrets } from "../wifi/credentials.js";
import type { ErrorReportInput, ErrorReportSubmitResult } from "./error-report-types.js";
import {
  ERROR_REPORT_REPO_NAME,
  ERROR_REPORT_REPO_OWNER,
  ERROR_REPORT_TITLE_PREFIX,
} from "./error-report-types.js";
import { sanitizeErrorReportInput } from "./error-report-sanitize.js";

const MAX_TECHNICAL_CHARS = 8_000;
const DEFAULT_LABELS = ["bug"];

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

function formatEnvironment(input: ErrorReportInput): string {
  const env = input.environment;
  const lines = [
    `- **Surface:** ${env.surface}`,
    `- **Product version:** ${env.productVersion}`,
    `- **Platform:** ${env.platform}`,
  ];
  if (env.osRelease) {
    lines.push(`- **OS release:** ${env.osRelease}`);
  }
  if (env.nodeVersion) {
    lines.push(`- **Node:** ${env.nodeVersion}`);
  }
  return lines.join("\n");
}

function formatSuggestedActions(error: ErrorReportInput["error"]): string {
  if (error.suggestedActions.length === 0) {
    return "_None_";
  }
  return error.suggestedActions.map((action) => `- ${action}`).join("\n");
}

export function buildInitialErrorReportBody(input: ErrorReportInput): string {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const technical = input.error.technicalDetails
    ? truncate(redactReportText(input.error.technicalDetails), MAX_TECHNICAL_CHARS)
    : undefined;
  const steps =
    input.deploySteps && input.deploySteps.length > 0
      ? input.deploySteps.map((step) => `- ${step}`).join("\n")
      : undefined;

  const parts = [
    "## Automated error report",
    "",
    `**Command attempted:** \`${normalizeCommandAttempted(input.commandAttempted)}\``,
    input.reporterLogin ? `**Reporter:** @${input.reporterLogin}` : "",
    `**Occurred (UTC):** ${occurredAt}`,
    "",
    "### Summary",
    "",
    redactReportText(input.error.summary),
    "",
    "### Error",
    "",
    `- **Code:** \`${input.error.code}\``,
    `- **Title:** ${input.error.title}`,
    "",
    "### Suggested actions",
    "",
    formatSuggestedActions(input.error),
    "",
    "### Environment",
    "",
    formatEnvironment(input),
  ].filter((line) => line !== "");

  if (steps) {
    parts.push("", "### Deploy / pipeline steps", "", steps);
  }
  if (technical) {
    parts.push("", "### Technical details", "", "```", technical, "```");
  }

  parts.push("", "---", "_Submitted by FTC Dev Tools error reporting._");
  return parts.join("\n");
}

export function buildErrorOccurrenceComment(input: ErrorReportInput): string {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const technical = input.error.technicalDetails
    ? truncate(redactReportText(input.error.technicalDetails), MAX_TECHNICAL_CHARS)
    : undefined;
  const steps =
    input.deploySteps && input.deploySteps.length > 0
      ? input.deploySteps.map((step) => `- ${step}`).join("\n")
      : undefined;

  const parts = [
    "### Occurrence report",
    "",
    `- **Occurred (UTC):** ${occurredAt}`,
    input.reporterLogin ? `- **Reporter:** @${input.reporterLogin}` : "",
    `- **Error code:** \`${input.error.code}\``,
    `- **Summary:** ${redactReportText(input.error.summary)}`,
  ].filter((line) => line !== "");

  if (steps) {
    parts.push("", "**Steps completed:**", "", steps);
  }
  if (technical) {
    parts.push("", "**Technical details:**", "", "```", technical, "```");
  }

  parts.push("", "---", "_Another occurrence via FTC Dev Tools._");
  return parts.join("\n");
}

interface GitHubIssueSearchItem {
  number: number;
  title: string;
  state: string;
  html_url: string;
}

interface GitHubIssueCreateResponse {
  number: number;
  html_url: string;
}

interface GitHubCommentCreateResponse {
  html_url: string;
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "ftc-dev-tools-error-report",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function listOpenRepoIssues(options: {
  token: string;
  fetchImpl?: FetchLike;
}): Promise<GitHubIssueSearchItem[]> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const repoBase = `https://api.github.com/repos/${ERROR_REPORT_REPO_OWNER}/${ERROR_REPORT_REPO_NAME}`;
  const collected: GitHubIssueSearchItem[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = `${repoBase}/issues?state=open&per_page=100&page=${page}`;
    const response = await fetchImpl(url, { headers: githubHeaders(options.token) });
    if (!response.ok) {
      const body = await response.text();
      throw Object.assign(new Error(`GitHub issue list failed (${response.status})`), {
        code: "GITHUB_ERROR_REPORT_FAILED",
        status: response.status,
        body,
      });
    }
    const batch = (await response.json()) as Array<
      GitHubIssueSearchItem & { pull_request?: unknown }
    >;
    for (const item of batch) {
      if (!item.pull_request) {
        collected.push(item);
      }
    }
    if (batch.length < 100) {
      break;
    }
  }

  return collected;
}

export async function findOpenErrorReportIssueByTitle(
  title: string,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<GitHubIssueSearchItem | undefined> {
  const issues = await listOpenRepoIssues(options);
  return issues.find((item) => item.title === title && item.state === "open");
}

export async function submitErrorReport(
  input: ErrorReportInput,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<ErrorReportSubmitResult> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const safeInput = sanitizeErrorReportInput(input);
  const title = buildErrorReportIssueTitle(
    safeInput.commandAttempted,
    safeInput.environment.productVersion,
  );
  const existing = await findOpenErrorReportIssueByTitle(title, {
    token: options.token,
    fetchImpl,
  });

  const repoBase = `https://api.github.com/repos/${ERROR_REPORT_REPO_OWNER}/${ERROR_REPORT_REPO_NAME}`;

  if (existing) {
    const issueCommentMarkdown = buildErrorOccurrenceComment(safeInput);
    const response = await fetchImpl(`${repoBase}/issues/${existing.number}/comments`, {
      method: "POST",
      headers: { ...githubHeaders(options.token), "Content-Type": "application/json" },
      body: JSON.stringify({ body: issueCommentMarkdown }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw Object.assign(new Error(`GitHub comment failed (${response.status})`), {
        code: "GITHUB_ERROR_REPORT_FAILED",
        status: response.status,
        body,
      });
    }
    const comment = (await response.json()) as GitHubCommentCreateResponse;
    return {
      action: "commented",
      issueNumber: existing.number,
      issueUrl: existing.html_url,
      commentUrl: comment.html_url,
    };
  }

  const issueBodyMarkdown = buildInitialErrorReportBody(safeInput);
  const response = await fetchImpl(`${repoBase}/issues`, {
    method: "POST",
    headers: { ...githubHeaders(options.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      body: issueBodyMarkdown,
      labels: DEFAULT_LABELS,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`GitHub issue create failed (${response.status})`), {
      code: "GITHUB_ERROR_REPORT_FAILED",
      status: response.status,
      body,
    });
  }
  const issue = (await response.json()) as GitHubIssueCreateResponse;
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
