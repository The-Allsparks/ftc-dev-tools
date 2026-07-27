import {
  PEDRO_BYLAZAR_MAVEN_URL,
  PEDRO_FTC_COORD,
  PEDRO_FULLPANELS_COORD,
  PEDRO_TELEMETRY_COORD,
} from "./defaults.js";
import type { PedroDependencyInfo } from "./types.js";

const IMPLEMENTATION_RE =
  /(?:implementation|api)\s+(?:\(?\s*)?['"]([^'":]+):([^'":]+):([^'"]+)['"]/g;

export function parseGradleDependencies(text: string): PedroDependencyInfo[] {
  const found: PedroDependencyInfo[] = [];
  const wanted = new Set([PEDRO_FTC_COORD, PEDRO_TELEMETRY_COORD, PEDRO_FULLPANELS_COORD]);
  for (const match of text.matchAll(IMPLEMENTATION_RE)) {
    const group = match[1] ?? "";
    const name = match[2] ?? "";
    const version = match[3] ?? "";
    const coord = `${group}:${name}`;
    if (!wanted.has(coord)) {
      continue;
    }
    found.push({ group, name, version, present: true });
  }
  return found;
}

export function hasByalazarRepo(text: string): boolean {
  return text.includes("mymaven.bylazar.com");
}

export function findCompileSdk(text: string): number | undefined {
  const match = text.match(/compileSdk(?:Version)?\s*(?:=|:)?\s*(\d+)/);
  if (!match?.[1]) {
    return undefined;
  }
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Ensure byalazar maven repo + Pedro implementation lines exist.
 * Preserves unrelated content; inserts surgically when possible.
 */
export function patchBuildDependenciesGradle(
  text: string,
  options: {
    ftcVersion: string;
    telemetryVersion: string;
    fullpanelsVersion: string;
  },
): { text: string; changes: string[] } {
  let next = text.replace(/\r\n/g, "\n");
  const changes: string[] = [];

  if (!hasByalazarRepo(next)) {
    const mavenLine = `    maven { url = '${PEDRO_BYLAZAR_MAVEN_URL}' }`;
    if (/repositories\s*\{/.test(next)) {
      next = next.replace(/repositories\s*\{/, (block) => `${block}\n${mavenLine}`);
      changes.push(`Add byalazar maven repository inside repositories {}`);
    } else {
      next =
        `repositories {\n${mavenLine}\n}\n\n` +
        (/dependencies\s*\{/.test(next) ? next : `dependencies {\n${next.trimEnd()}\n}\n`);
      changes.push("Add repositories {} block with byalazar maven URL");
    }
  }

  const ensureDep = (coord: string, version: string, label: string): void => {
    const [group, name] = coord.split(":");
    const line = `    implementation '${group}:${name}:${version}'`;
    const existing = new RegExp(
      `(?:implementation|api)\\s+(?:\\(?\\s*)?['"]${escapeRegExp(group!)}:${escapeRegExp(name!)}:[^'"]+['"]`,
    );
    if (existing.test(next)) {
      const updated = next.replace(existing, `implementation '${group}:${name}:${version}'`);
      if (updated !== next) {
        next = updated;
        changes.push(`Update ${label} to ${version}`);
      }
      return;
    }
    if (/dependencies\s*\{/.test(next)) {
      next = next.replace(/dependencies\s*\{/, (block) => `${block}\n${line}`);
      changes.push(`Add ${label} ${version}`);
      return;
    }
    next = `${next.trimEnd()}\n\ndependencies {\n${line}\n}\n`;
    changes.push(`Add dependencies {} with ${label} ${version}`);
  };

  ensureDep(PEDRO_FTC_COORD, options.ftcVersion, "com.pedropathing:ftc");
  ensureDep(PEDRO_TELEMETRY_COORD, options.telemetryVersion, "com.pedropathing:telemetry");
  ensureDep(PEDRO_FULLPANELS_COORD, options.fullpanelsVersion, "com.bylazar:fullpanels");

  return { text: next, changes };
}

export function patchCompileSdkInText(
  text: string,
  targetSdk: number,
): { text: string; changed: boolean } {
  const re = /(compileSdk(?:Version)?\s*(?:=|:)?\s*)(\d+)/;
  if (!re.test(text)) {
    return { text, changed: false };
  }
  const current = findCompileSdk(text);
  if (current !== undefined && current >= targetSdk) {
    return { text, changed: false };
  }
  return {
    text: text.replace(re, `$1${targetSdk}`),
    changed: true,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
