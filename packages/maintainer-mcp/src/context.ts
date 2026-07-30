import { resolveGitHubReportToken } from "@ftc-dev-tools/shared";
import type { FetchLike } from "@ftc-dev-tools/shared";

export const DEFAULT_REPO = "The-Allsparks/ftc-dev-tools";

export interface RepoRef {
  owner: string;
  name: string;
}

export interface MaintainerContext {
  repo: RepoRef;
  token: string;
  fetchImpl: FetchLike;
}

export function parseRepoRef(raw: string | undefined): RepoRef {
  const value = (raw ?? DEFAULT_REPO).trim();
  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) {
    throw Object.assign(new Error(`Invalid GITHUB_REPO: ${value}`), { code: "INVALID_REPO" });
  }
  return { owner: value.slice(0, slash), name: value.slice(slash + 1) };
}

export async function createMaintainerContext(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MaintainerContext> {
  const token =
    env.GITHUB_TOKEN?.trim() || env.GH_TOKEN?.trim() || (await resolveGitHubReportToken());
  if (!token) {
    throw Object.assign(
      new Error(
        "GitHub token required. Set GITHUB_TOKEN/GH_TOKEN or run `ftc github link` for error-report token.",
      ),
      { code: "GITHUB_TOKEN_MISSING" },
    );
  }
  return {
    repo: parseRepoRef(env.GITHUB_REPO),
    token,
    fetchImpl: globalThis.fetch as FetchLike,
  };
}

export function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(1, Math.floor(value)), max);
}

export function parseSinceDays(raw: string | undefined, fallbackDays: number): Date {
  if (!raw?.trim()) {
    return daysAgo(fallbackDays);
  }
  const trimmed = raw.trim();
  const relative = trimmed.match(/^(\d+)\s*d$/i);
  if (relative) {
    return daysAgo(Number(relative[1]));
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return daysAgo(fallbackDays);
  }
  return parsed;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n… (truncated)`;
}

export function redactSecrets(text: string): string {
  return text
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "ghp_***")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "github_pat_***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
}
