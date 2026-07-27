/**
 * Normalize and compare FTC SDK version strings (e.g. "11.2.0", "v11.2", "11.2").
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

export function normalizeVersion(input: string): string {
  return input.trim().replace(/^v/i, "");
}

export function parseVersion(input: string): ParsedVersion | undefined {
  const normalized = normalizeVersion(input);
  const match = normalized.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return undefined;
  }
  return {
    major: Number.parseInt(match[1] ?? "0", 10),
    minor: Number.parseInt(match[2] ?? "0", 10),
    patch: Number.parseInt(match[3] ?? "0", 10),
    raw: normalized,
  };
}

/** Negative if a < b, 0 if equal, positive if a > b. Undefined if either unparsable. */
export function compareVersions(a: string, b: string): number | undefined {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    return undefined;
  }
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

export function versionsEqual(a: string, b: string): boolean {
  const cmp = compareVersions(a, b);
  return cmp === 0;
}
