import { VISION_CLI_SCHEMA_VERSION } from "./constants.js";
import type { VisionCliJsonEnvelope } from "./types.js";

const SERIAL_PATTERN = /\b[A-Z0-9]{8,16}\b/g;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function redactString(value: string): string {
  return value.replace(SERIAL_PATTERN, "[serial-redacted]").replace(IPV4_PATTERN, "[ip-redacted]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = redactValue(nested);
    }
    return out;
  }
  return value;
}

export function redactVisionCliPayload<T>(payload: T): T {
  return redactValue(payload) as T;
}

export function wrapVisionCliJson<T>(
  command: string,
  data: T,
  options: { redact?: boolean } = {},
): VisionCliJsonEnvelope<T> {
  const redacted = options.redact === true;
  return {
    schemaVersion: VISION_CLI_SCHEMA_VERSION,
    command,
    generatedAt: new Date().toISOString(),
    redacted,
    data: redacted ? redactVisionCliPayload(data) : data,
  };
}

export function formatEndpointTable(
  rows: Array<{ kind: string; target: string; reachable: string; provider: string }>,
): string[] {
  if (rows.length === 0) {
    return ["(no endpoints)"];
  }
  const headers = ["KIND", "TARGET", "REACHABLE", "PROVIDER"];
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => {
        const values = [row.kind, row.target, row.reachable, row.provider];
        return values[index]?.length ?? 0;
      }),
    ),
  );
  const formatRow = (cells: string[]) =>
    cells.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join("  ");
  return [
    formatRow(headers),
    formatRow(widths.map((width) => "-".repeat(width))),
    ...rows.map((row) => formatRow([row.kind, row.target, row.reachable, row.provider])),
  ];
}
