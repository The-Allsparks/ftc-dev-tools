import type { CommandSpec } from "../types/process.js";

const UNSAFE_ARG_PATTERN = /[\r\n\0]/;

export function assertSafeCommandSpec(spec: CommandSpec): void {
  if (!spec.command || typeof spec.command !== "string") {
    throw new Error("Command executable must be a non-empty string.");
  }
  if (UNSAFE_ARG_PATTERN.test(spec.command)) {
    throw new Error("Command executable contains invalid characters.");
  }
  for (const arg of spec.args) {
    if (typeof arg !== "string") {
      throw new Error("Command arguments must be strings.");
    }
    if (UNSAFE_ARG_PATTERN.test(arg)) {
      throw new Error("Command argument contains invalid characters.");
    }
  }
}

export function quoteForDisplay(value: string): string {
  if (/^[A-Za-z0-9_./:\\-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

export function formatCommandForDisplay(spec: CommandSpec): string {
  return [quoteForDisplay(spec.command), ...spec.args.map(quoteForDisplay)].join(" ");
}
