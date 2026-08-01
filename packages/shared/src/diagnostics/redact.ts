const SERIAL_PATTERN = /\b[A-Z0-9]{8,16}\b/g;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const USER_HOME_PATTERN =
  /(?:[A-Za-z]:\\Users\\[^\\]+|\/Users\/[^/]+|\/home\/[^/]+)(?:\\|\/)?/g;

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(password|passwd|token|api[_-]?key)\s*[:=]\s*\S+/gi,
];

export function redactDiagnosticText(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "$1=***");
  }
  return out
    .replace(SERIAL_PATTERN, "[serial-redacted]")
    .replace(IPV4_PATTERN, "[ip-redacted]")
    .replace(USER_HOME_PATTERN, "[home]/");
}

export function redactDiagnosticValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactDiagnosticText(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactDiagnosticValue(entry));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = redactDiagnosticValue(nested);
    }
    return out;
  }
  return value;
}

export function truncateDiagnosticText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n… (truncated at ${maxChars} chars)`;
}
