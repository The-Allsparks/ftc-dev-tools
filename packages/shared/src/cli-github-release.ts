import {
  buildCliInstallFromTarballUrl,
  cliGitHubReleaseTarballUrl,
  cliReleaseTarballBasename,
} from "./cli-consumer-install.js";
import type { FetchLike } from "./sdk/types.js";
import { FTC_DEV_TOOLS_GITHUB_OWNER, FTC_DEV_TOOLS_GITHUB_REPO } from "./cli-consumer-install.js";

export const FTC_DEV_TOOLS_RELEASES_API = `https://api.github.com/repos/${FTC_DEV_TOOLS_GITHUB_OWNER}/${FTC_DEV_TOOLS_GITHUB_REPO}/releases`;

export interface CliGitHubReleaseTarball {
  version: string;
  tagName: string;
  tarballUrl: string;
  assetName: string;
}

export interface CliGitHubReleaseOptions {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  userAgent?: string;
}

interface GitHubReleaseAssetJson {
  name?: string;
  browser_download_url?: string;
}

interface GitHubReleaseJson {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubReleaseAssetJson[];
}

const CLI_TARBALL_ASSET_RE = /^ftc-cli-(.+)\.tar\.gz$/i;

/** Parse semver from a release asset name (`ftc-cli-0.1.0.tar.gz`). */
export function parseCliTarballAssetName(assetName: string): string | undefined {
  const match = assetName.match(CLI_TARBALL_ASSET_RE);
  return match?.[1];
}

/** Pick the CLI tarball asset from a GitHub Release JSON object. */
export function pickCliTarballFromRelease(
  release: GitHubReleaseJson,
): CliGitHubReleaseTarball | undefined {
  if (release.draft === true || !release.tag_name) {
    return undefined;
  }
  for (const asset of release.assets ?? []) {
    if (!asset.name || !asset.browser_download_url) {
      continue;
    }
    const version = parseCliTarballAssetName(asset.name);
    if (version) {
      return {
        version,
        tagName: release.tag_name,
        tarballUrl: asset.browser_download_url,
        assetName: asset.name,
      };
    }
  }
  const version = release.tag_name.replace(/^v/i, "");
  if (!version) {
    return undefined;
  }
  return {
    version,
    tagName: release.tag_name,
    tarballUrl: cliGitHubReleaseTarballUrl(version),
    assetName: cliReleaseTarballBasename(version),
  };
}

async function fetchReleaseJson(
  url: string,
  options: CliGitHubReleaseOptions,
): Promise<GitHubReleaseJson> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available in this runtime."), {
      code: "CLI_RELEASE_NETWORK",
    });
  }

  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(url, {
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
      code: "CLI_RELEASE_NETWORK",
      technicalDetails: message,
    });
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`GitHub Releases returned ${response.status} ${response.statusText}`),
      {
        code: "CLI_RELEASE_NETWORK",
        technicalDetails: `${response.status} ${response.statusText}`,
      },
    );
  }

  return (await response.json()) as GitHubReleaseJson;
}

/** Latest published GitHub Release that ships a CLI tarball (uses `/releases/latest`). */
export async function fetchLatestCliGitHubRelease(
  options: CliGitHubReleaseOptions = {},
): Promise<CliGitHubReleaseTarball> {
  const release = await fetchReleaseJson(`${FTC_DEV_TOOLS_RELEASES_API}/latest`, options);
  const picked = pickCliTarballFromRelease(release);
  if (!picked) {
    throw Object.assign(new Error("Latest GitHub Release has no ftc-cli tarball asset."), {
      code: "CLI_RELEASE_NOT_FOUND",
      technicalDetails: release.tag_name,
    });
  }
  return picked;
}

export async function buildCliInstallFromLatestGitHubRelease(
  options: CliGitHubReleaseOptions & { platform?: NodeJS.Platform } = {},
): Promise<{ installCommand: string; release: CliGitHubReleaseTarball }> {
  const release = await fetchLatestCliGitHubRelease(options);
  const platform = options.platform ?? process.platform;
  return {
    release,
    installCommand: buildCliInstallFromTarballUrl(release.tarballUrl, platform),
  };
}
