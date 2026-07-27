import { assertAllowedDownloadUrl } from "./allowlist.js";
import { HUB_OS_CHANGELOG_URL, HUB_OS_TAG_PREFIX } from "./defaults.js";
import type { HubOsRelease } from "./types.js";

/**
 * Parse REV Control Hub OS download links from changelog / docs HTML.
 * Expected shape: .../REVrobotics/REV-Software-Binaries/releases/download/chos-X.Y.Z/*.zip
 */
export function parseHubOsCatalogFromHtml(
  html: string,
  changelogUrl: string = HUB_OS_CHANGELOG_URL,
): HubOsRelease[] {
  const releases: HubOsRelease[] = [];
  const seen = new Set<string>();
  const re =
    /https:\/\/github\.com\/REVrobotics\/REV-Software-Binaries\/releases\/download\/(chos-[\d.]+)\/([^"'\\\s>]+)/gi;
  for (const match of html.matchAll(re)) {
    const tag = match[1] ?? "";
    const assetName = decodeURIComponent(match[2] ?? "");
    const downloadUrl = match[0] ?? "";
    if (!tag || !assetName || !downloadUrl) {
      continue;
    }
    try {
      assertAllowedDownloadUrl(downloadUrl);
    } catch {
      continue;
    }
    const version = tag.startsWith(HUB_OS_TAG_PREFIX) ? tag.slice(HUB_OS_TAG_PREFIX.length) : tag;
    const key = `${version}|${assetName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    releases.push({
      version,
      tag,
      downloadUrl,
      changelogUrl,
      assetName,
    });
  }
  return sortReleasesNewestFirst(releases);
}

export function pickLatestHubOsRelease(releases: HubOsRelease[]): HubOsRelease | undefined {
  return releases[0];
}

export function findHubOsReleaseByVersion(
  releases: HubOsRelease[],
  versionOrTag: string,
): HubOsRelease | undefined {
  const needle = versionOrTag.trim().replace(/^v/i, "");
  const tagNeedle = needle.startsWith(HUB_OS_TAG_PREFIX) ? needle : `${HUB_OS_TAG_PREFIX}${needle}`;
  const versionNeedle = needle.startsWith(HUB_OS_TAG_PREFIX)
    ? needle.slice(HUB_OS_TAG_PREFIX.length)
    : needle;
  return releases.find((r) => r.tag === tagNeedle || r.version === versionNeedle);
}

function sortReleasesNewestFirst(releases: HubOsRelease[]): HubOsRelease[] {
  return [...releases].sort((a, b) => compareLooseVersions(b.version, a.version));
}

function compareLooseVersions(a: string, b: string): number {
  const pa = a.split(".").map((p) => Number.parseInt(p, 10) || 0);
  const pb = b.split(".").map((p) => Number.parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) {
      return d;
    }
  }
  return 0;
}

/** Best-effort OS version extraction from Robot Controller Console HTML. */
export function parseOsVersionFromConsoleHtml(html: string): string | undefined {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const patterns = [
    /Control\s+Hub\s+Operating\s+System[^0-9]{0,40}(\d+\.\d+(?:\.\d+)?)/i,
    /Operating\s+System(?:\s+Version)?\s*[:：]\s*(\d+\.\d+(?:\.\d+)?)/i,
    /OS\s+Version\s*[:：]\s*(\d+\.\d+(?:\.\d+)?)/i,
    /chos[-\s]?(\d+\.\d+(?:\.\d+)?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      return m[1];
    }
  }
  return undefined;
}
