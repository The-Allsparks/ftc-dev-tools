import { compareVersions, normalizeVersion } from "../sdk/compare-versions.js";
import type { FetchLike } from "../sdk/types.js";
import { PEDRO_FTC_MAVEN_METADATA_URL } from "./defaults.js";

export async function resolvePedroFtcVersion(options: {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  /** Explicit version or tag; skips metadata fetch. */
  version?: string;
}): Promise<string> {
  if (options.version?.trim()) {
    return normalizeVersion(options.version.trim());
  }

  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available"), { code: "PEDRO_NETWORK" });
  }

  const response = await fetchImpl(PEDRO_FTC_MAVEN_METADATA_URL, {
    method: "GET",
    headers: { Accept: "application/xml,text/xml,*/*" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(`Failed to fetch Pedro FTC Maven metadata (${response.status})`),
      { code: "PEDRO_NETWORK" },
    );
  }
  const xml = await response.text();
  const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
    .map((m) => m[1]!)
    .filter(Boolean);
  const stable = versions.filter((v) => !/[a-zA-Z]/.test(v));
  const pool = stable.length > 0 ? stable : versions;
  if (pool.length === 0) {
    throw Object.assign(new Error("No versions found in Pedro FTC Maven metadata."), {
      code: "PEDRO_NETWORK",
    });
  }
  pool.sort((a, b) => {
    const cmp = compareVersions(a, b);
    return cmp === undefined ? a.localeCompare(b) : cmp;
  });
  return pool[pool.length - 1]!;
}
