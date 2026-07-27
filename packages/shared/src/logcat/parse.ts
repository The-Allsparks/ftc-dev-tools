import type { LogEntry } from "../types/device.js";

/**
 * Parses common `adb logcat -v threadtime` lines.
 * Falls back to a raw entry when the line does not match.
 */
export function parseLogcatLine(line: string): LogEntry {
  const match = line.match(
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s*(.*)$/,
  );
  if (!match) {
    return {
      level: "I",
      tag: "raw",
      message: line,
      raw: line,
    };
  }
  return {
    timestamp: match[1],
    pid: match[2],
    tid: match[3],
    level: match[4]!,
    tag: match[5]!.trim(),
    message: match[6] ?? "",
    raw: line,
  };
}

export function formatLogEntry(entry: LogEntry, raw: boolean): string {
  if (raw) {
    return entry.raw;
  }
  const ts = entry.timestamp ? `${entry.timestamp} ` : "";
  return `${ts}${entry.level}/${entry.tag}: ${entry.message}`;
}
