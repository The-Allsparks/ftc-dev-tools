import { normalizeVersion, parseVersion } from "./compare-versions.js";
import type { FetchLike, RemoteSdkRelease } from "./types.js";

export const FTC_SDK_GITHUB_OWNER = "FIRST-Tech-Challenge";
export const FTC_SDK_GITHUB_REPO = "FtcRobotController";
export const FTC_SDK_RELEASES_URL = `https://api.github.com/repos/${FTC_SDK_GITHUB_OWNER}/${FTC_SDK_GITHUB_REPO}/releases`;

export interface GitHubReleasesOptions {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  userAgent?: string;
}

interface GitHubReleaseJson {
  tag_name?: string;
  name?: string;
  html_url?: string;
  zipball_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export async function fetchLatestSdkRelease(
  options: GitHubReleasesOptions = {},
): Promise<RemoteSdkRelease> {
  const releases = await listSdkReleases(options);
  const latest = releases.find((r) => !r.draft && !r.prerelease) ?? releases[0];
  if (!latest) {
    throw Object.assign(new Error("No FTC SDK releases found on GitHub."), {
      code: "SDK_UPDATE_NETWORK",
    });
  }
  return latest;
}

export async function fetchSdkReleaseByTag(
  tag: string,
  options: GitHubReleasesOptions = {},
): Promise<RemoteSdkRelease> {
  const normalizedWanted = normalizeVersion(tag);
  const releases = await listSdkReleases(options);
  const hit = releases.find(
    (r) =>
      normalizeVersion(r.tagName) === normalizedWanted ||
      r.tagName === tag ||
      normalizeVersion(r.version) === normalizedWanted,
  );
  if (!hit) {
    throw Object.assign(new Error(`FTC SDK release tag not found: ${tag}`), {
      code: "SDK_UPDATE_NETWORK",
      technicalDetails: `Requested tag: ${tag}`,
    });
  }
  return hit;
}

export async function listSdkReleases(
  options: GitHubReleasesOptions = {},
): Promise<RemoteSdkRelease[]> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available in this runtime."), {
      code: "SDK_UPDATE_NETWORK",
    });
  }

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(`${FTC_SDK_RELEASES_URL}?per_page=20`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": options.userAgent ?? "ftc-dev-tools",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: options.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`Failed to reach GitHub Releases: ${message}`), {
      code: "SDK_UPDATE_NETWORK",
      technicalDetails: message,
    });
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`GitHub Releases returned ${response.status} ${response.statusText}`),
      {
        code: "SDK_UPDATE_NETWORK",
        technicalDetails: `${response.status} ${response.statusText}`,
      },
    );
  }

  const raw = (await response.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw Object.assign(new Error("Unexpected GitHub Releases response shape."), {
      code: "SDK_UPDATE_NETWORK",
    });
  }

  return raw
    .map((item) => parseRelease(item as GitHubReleaseJson))
    .filter((r): r is RemoteSdkRelease => r !== undefined);
}

function parseRelease(json: GitHubReleaseJson): RemoteSdkRelease | undefined {
  if (!json.tag_name || !json.zipball_url || !json.html_url) {
    return undefined;
  }
  const version = normalizeVersion(json.tag_name);
  if (!parseVersion(version)) {
    return undefined;
  }
  return {
    tagName: json.tag_name,
    version,
    name: json.name ?? json.tag_name,
    htmlUrl: json.html_url,
    zipballUrl: json.zipball_url,
    publishedAt: json.published_at,
    draft: json.draft === true,
    prerelease: json.prerelease === true,
  };
}
