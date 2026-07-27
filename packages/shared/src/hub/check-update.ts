import { interpretFromUnknown } from "../errors/interpret.js";
import { compareVersions } from "../sdk/compare-versions.js";
import type { FetchLike } from "../sdk/types.js";
import type { ProcessRunner } from "../types/process.js";
import { HUB_OS_CHANGELOG_URL } from "./defaults.js";
import { fetchHubOsCatalog } from "./fetch-os-catalog.js";
import { findHubOsReleaseByVersion, pickLatestHubOsRelease } from "./parse-os-catalog.js";
import { getHubStatus } from "./status.js";
import type { DeviceProvider } from "../types/device.js";
import type { HubOsFreshness, HubUpdateCheckReport } from "./types.js";

export interface CheckHubUpdateOptions {
  runner: ProcessRunner;
  deviceProvider?: DeviceProvider;
  deviceSerial?: string;
  /** Compare against this OS version/tag instead of latest. */
  version?: string;
  /** When set, skip device probe and use this as local OS version. */
  localOsVersion?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  catalogUrl?: string;
}

export async function checkHubUpdate(
  options: CheckHubUpdateOptions,
): Promise<HubUpdateCheckReport> {
  const generatedAt = new Date().toISOString();
  const catalogSourceUrl = options.catalogUrl ?? HUB_OS_CHANGELOG_URL;

  let localOsVersion = options.localOsVersion;
  if (!localOsVersion) {
    const status = await getHubStatus({
      runner: options.runner,
      deviceProvider: options.deviceProvider,
      deviceSerial: options.deviceSerial,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    });
    localOsVersion = status.device?.osVersion;
  }

  try {
    const { releases, sourceUrl } = await fetchHubOsCatalog({
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      catalogUrl: options.catalogUrl,
    });
    const remote = options.version
      ? findHubOsReleaseByVersion(releases, options.version)
      : pickLatestHubOsRelease(releases);

    if (!remote) {
      return {
        localOsVersion,
        freshness: "unknown",
        message: `Requested Control Hub OS version not found in catalog: ${options.version}`,
        generatedAt,
        catalogSourceUrl: sourceUrl,
        error: interpretFromUnknown(
          Object.assign(new Error(`OS version not in catalog: ${options.version}`), {
            code: "HUB_UPDATE_CATALOG_EMPTY",
          }),
        ),
      };
    }

    const freshness = computeFreshness(localOsVersion, remote.version);
    return {
      localOsVersion,
      remote,
      freshness,
      message: freshnessMessage(freshness, localOsVersion, remote.version),
      generatedAt,
      catalogSourceUrl: sourceUrl,
    };
  } catch (error) {
    return {
      localOsVersion,
      freshness: "unknown",
      message: "Could not check Control Hub OS updates.",
      generatedAt,
      catalogSourceUrl,
      error: interpretFromUnknown(error),
    };
  }
}

function computeFreshness(local: string | undefined, remote: string): HubOsFreshness {
  if (!local) {
    return "unknown";
  }
  const cmp = compareVersions(local, remote);
  if (cmp === undefined) {
    return "unknown";
  }
  if (cmp === 0) {
    return "up-to-date";
  }
  return cmp < 0 ? "behind" : "ahead";
}

function freshnessMessage(
  freshness: HubOsFreshness,
  local: string | undefined,
  remote: string,
): string {
  if (!local) {
    return `Latest Control Hub OS is ${remote}; local OS version could not be determined.`;
  }
  switch (freshness) {
    case "up-to-date":
      return `Control Hub OS ${local} matches latest published ${remote}.`;
    case "behind":
      return `Control Hub OS ${local} is behind latest published ${remote}.`;
    case "ahead":
      return `Control Hub OS ${local} is ahead of catalog latest ${remote}.`;
    default:
      return `Could not compare local OS ${local} to remote ${remote}.`;
  }
}
