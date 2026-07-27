import { interpretFromUnknown } from "../errors/interpret.js";
import type { FetchLike } from "../sdk/types.js";
import { assertAllowedMetadataUrl } from "./allowlist.js";
import { HUB_OS_CHANGELOG_URL } from "./defaults.js";
import { parseHubOsCatalogFromHtml, pickLatestHubOsRelease } from "./parse-os-catalog.js";
import type { HubOsRelease } from "./types.js";

export interface FetchHubOsCatalogOptions {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  catalogUrl?: string;
}

export async function fetchHubOsCatalog(
  options: FetchHubOsCatalogOptions = {},
): Promise<{ releases: HubOsRelease[]; sourceUrl: string }> {
  const sourceUrl = options.catalogUrl ?? HUB_OS_CHANGELOG_URL;
  assertAllowedMetadataUrl(sourceUrl);
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available"), { code: "HUB_UPDATE_NETWORK" });
  }
  const response = await fetchImpl(sourceUrl, {
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(
        `Failed to fetch Control Hub OS catalog (${response.status} ${response.statusText})`,
      ),
      { code: "HUB_UPDATE_NETWORK" },
    );
  }
  const html = await response.text();
  const releases = parseHubOsCatalogFromHtml(html, sourceUrl);
  if (releases.length === 0) {
    throw Object.assign(
      new Error("No allowlisted Control Hub OS download links found in REV changelog."),
      { code: "HUB_UPDATE_CATALOG_EMPTY" },
    );
  }
  return { releases, sourceUrl };
}

export async function fetchLatestHubOsRelease(
  options: FetchHubOsCatalogOptions = {},
): Promise<HubOsRelease> {
  const { releases } = await fetchHubOsCatalog(options);
  const latest = pickLatestHubOsRelease(releases);
  if (!latest) {
    throw Object.assign(new Error("Control Hub OS catalog was empty."), {
      code: "HUB_UPDATE_CATALOG_EMPTY",
    });
  }
  return latest;
}

export function mapCatalogError(error: unknown): ReturnType<typeof interpretFromUnknown> {
  return interpretFromUnknown(error);
}
