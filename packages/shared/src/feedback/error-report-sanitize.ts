import type { FriendlyError } from "../types/errors.js";
import type { ErrorReportInput } from "./error-report-types.js";
import { redactSecrets } from "../wifi/credentials.js";

const MAX_SCALAR_LENGTH = 4_000;
const CONFIG_FILE_MARKER = ".ftc-dev.json";

function normalizeCommandAttempted(commandAttempted: string): string {
  return commandAttempted.trim().replace(/\s+/g, " ");
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

function redactAbsolutePaths(text: string): string {
  return text
    .replace(/[A-Za-z]:\\[^\s"'<>|]+/g, "[path]")
    .replace(/\/(?:Users|home|tmp|var)[^\s"'<>|]*/g, "[path]");
}

/** Drop config-file-derived lines so local `.ftc-dev.json` is never sent off-machine. */
function stripConfigDerivedLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const lower = line.toLowerCase();
      if (lower.includes(CONFIG_FILE_MARKER)) {
        return false;
      }
      if (lower.includes("preferreddeviceserial") || lower.includes("wifipassword")) {
        return false;
      }
      return true;
    })
    .join("\n");
}

function sanitizeScalar(value: string, maxLength = MAX_SCALAR_LENGTH): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const stripped = stripConfigDerivedLines(trimmed);
  const redacted = redactReportText(redactAbsolutePaths(stripped));
  if (redacted.length <= maxLength) {
    return redacted;
  }
  return `${redacted.slice(0, maxLength)}\n… (truncated)`;
}

function sanitizeFriendlyError(error: FriendlyError): FriendlyError {
  return {
    code: sanitizeScalar(error.code, 120),
    title: sanitizeScalar(error.title, 240),
    summary: sanitizeScalar(error.summary),
    suggestedActions: error.suggestedActions.map((action) => sanitizeScalar(action, 500)),
    technicalDetails: error.technicalDetails
      ? sanitizeScalar(error.technicalDetails, 8_000)
      : undefined,
    suggestedProjectRoots: error.suggestedProjectRoots?.map((root) => sanitizeScalar(root, 260)),
  };
}

/** Build a fresh report object for outbound GitHub API payloads (redacted, no raw config file text). */
export function sanitizeErrorReportInput(input: ErrorReportInput): ErrorReportInput {
  return {
    commandAttempted: normalizeCommandAttempted(input.commandAttempted),
    reporterLogin: input.reporterLogin
      ? sanitizeScalar(input.reporterLogin, 80).replace(/[^\w-]/g, "")
      : undefined,
    occurredAt: input.occurredAt,
    environment: { ...input.environment },
    deploySteps: input.deploySteps?.map((step) => sanitizeScalar(step, 500)),
    error: sanitizeFriendlyError(input.error),
  };
}
