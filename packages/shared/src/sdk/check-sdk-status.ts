import { interpretFromUnknown } from "../errors/interpret.js";
import { compareVersions } from "./compare-versions.js";
import { detectLocalSdk } from "./detect-local-sdk.js";
import { fetchLatestSdkRelease, fetchSdkReleaseByTag } from "./github-releases.js";
import type { FetchLike, SdkFreshness, SdkStatusReport } from "./types.js";

export interface CheckSdkStatusOptions {
  projectRoot: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  /** When set, compare against this release tag instead of latest. */
  targetTag?: string;
}

export async function checkSdkStatus(options: CheckSdkStatusOptions): Promise<SdkStatusReport> {
  const generatedAt = new Date().toISOString();
  const local = await detectLocalSdk(options.projectRoot);

  if (!local.dependenciesPath) {
    return {
      local,
      freshness: "unknown",
      message: "No build.dependencies.gradle found; cannot detect FTC Maven SDK version.",
      generatedAt,
      error: interpretFromUnknown(
        Object.assign(new Error("build.dependencies.gradle is missing."), {
          code: "SDK_DEPS_MISSING",
        }),
      ),
    };
  }

  if (!local.version) {
    return {
      local,
      freshness: "unknown",
      message: "build.dependencies.gradle has no org.firstinspires.ftc Maven coordinates.",
      generatedAt,
      error: interpretFromUnknown(
        Object.assign(new Error("No FTC Maven artifacts found in build.dependencies.gradle."), {
          code: "SDK_DEPS_MISSING",
        }),
      ),
    };
  }

  try {
    const remote = options.targetTag
      ? await fetchSdkReleaseByTag(options.targetTag, {
          fetchImpl: options.fetchImpl,
          signal: options.signal,
        })
      : await fetchLatestSdkRelease({
          fetchImpl: options.fetchImpl,
          signal: options.signal,
        });

    const freshness = computeFreshness(local.version, remote.version);
    const mismatchNote = local.mismatchedVersions
      ? " Local FTC artifact versions disagree with each other."
      : "";

    return {
      local,
      remote,
      freshness,
      message: freshnessMessage(freshness, local.version, remote.version) + mismatchNote,
      generatedAt,
      error: local.mismatchedVersions
        ? interpretFromUnknown(
            Object.assign(new Error("FTC Maven artifact versions are inconsistent."), {
              code: "SDK_VERSION_MISMATCH",
            }),
          )
        : undefined,
    };
  } catch (error) {
    return {
      local,
      freshness: "unknown",
      message: `Local FTC SDK ${local.version}; could not check GitHub for updates.`,
      generatedAt,
      error: interpretFromUnknown(error),
    };
  }
}

function computeFreshness(localVersion: string, remoteVersion: string): SdkFreshness {
  const cmp = compareVersions(localVersion, remoteVersion);
  if (cmp === undefined) {
    return "unknown";
  }
  if (cmp === 0) {
    return "up-to-date";
  }
  if (cmp < 0) {
    return "behind";
  }
  return "ahead";
}

function freshnessMessage(
  freshness: SdkFreshness,
  localVersion: string,
  remoteVersion: string,
): string {
  switch (freshness) {
    case "up-to-date":
      return `FTC SDK ${localVersion} matches latest (${remoteVersion}).`;
    case "behind":
      return `FTC SDK ${localVersion} is behind latest ${remoteVersion}.`;
    case "ahead":
      return `FTC SDK ${localVersion} is ahead of latest release ${remoteVersion}.`;
    default:
      return `FTC SDK local ${localVersion}, remote ${remoteVersion}.`;
  }
}
