import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { FetchLike } from "../sdk/types.js";
import { assertAllowedDownloadUrl } from "./allowlist.js";
import { fetchHubOsCatalog } from "./fetch-os-catalog.js";
import { findHubOsReleaseByVersion, pickLatestHubOsRelease } from "./parse-os-catalog.js";
import { ensureHubUpdateCacheDir, hubOsCacheFilePath } from "./paths.js";
import type { HubDownloadResult, HubOsRelease } from "./types.js";

export interface DownloadHubOsOptions {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  version?: string;
  catalogUrl?: string;
  cacheDir?: string;
  /** Explicit allowlisted download URL (skips catalog lookup). */
  downloadUrl?: string;
  dryRun?: boolean;
  yes?: boolean;
}

export async function downloadHubOsUpdate(
  options: DownloadHubOsOptions = {},
): Promise<HubDownloadResult> {
  try {
    const release = await resolveRelease(options);
    assertAllowedDownloadUrl(release.downloadUrl);
    const cacheDir = await ensureHubUpdateCacheDir(options.cacheDir);
    const filePath = hubOsCacheFilePath(cacheDir, release.version, release.assetName);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile() && stat.size > 0) {
        return {
          success: true,
          dryRun: false,
          release,
          filePath,
          bytesWritten: stat.size,
          alreadyPresent: true,
          message: `Control Hub OS ${release.version} already cached at ${filePath}`,
        };
      }
    } catch {
      // not present
    }

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        release,
        filePath,
        message: `Dry run: would download ${release.downloadUrl} → ${filePath}`,
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        release,
        filePath,
        message:
          "Refusing to download Control Hub OS without --yes. Re-run with --dry-run to preview or --yes to download.",
        error: interpretFromUnknown(
          Object.assign(new Error("Hub OS download requires --yes."), {
            code: "HUB_UPDATE_ABORTED",
          }),
        ),
      };
    }

    const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
    if (!fetchImpl) {
      throw Object.assign(new Error("fetch is not available"), { code: "HUB_UPDATE_NETWORK" });
    }

    const response = await fetchImpl(release.downloadUrl, {
      method: "GET",
      signal: options.signal,
      headers: { Accept: "application/octet-stream" },
    });
    if (!response.ok) {
      throw Object.assign(
        new Error(`Download failed (${response.status} ${response.statusText})`),
        { code: "HUB_UPDATE_NETWORK", technicalDetails: release.downloadUrl },
      );
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const bytesWritten = await writeFetchResponseToFile(response, filePath);

    return {
      success: true,
      dryRun: false,
      release,
      filePath,
      bytesWritten,
      message: `Downloaded Control Hub OS ${release.version} (${bytesWritten} bytes) to ${filePath}`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      message: "Failed to download Control Hub OS update.",
      error: interpretFromUnknown(error),
    };
  }
}

async function writeFetchResponseToFile(
  response: Awaited<ReturnType<FetchLike>>,
  filePath: string,
): Promise<number> {
  const streamBody = (response as { body?: ReadableStream<Uint8Array> | null }).body;
  if (streamBody) {
    const nodeStream = Readable.fromWeb(streamBody as import("node:stream/web").ReadableStream);
    await pipeline(nodeStream, createWriteStream(filePath));
    const stat = await fs.stat(filePath);
    return stat.size;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return buffer.byteLength;
}

async function resolveRelease(options: DownloadHubOsOptions): Promise<HubOsRelease> {
  if (options.downloadUrl) {
    const url = assertAllowedDownloadUrl(options.downloadUrl);
    const assetName = path.basename(url.pathname) || "controlHubOS.zip";
    const tagMatch = url.pathname.match(/\/(chos-[\d.]+)\//i);
    const tag = tagMatch?.[1] ?? "chos-unknown";
    const version = tag.replace(/^chos-/i, "");
    return {
      version,
      tag,
      downloadUrl: url.toString(),
      changelogUrl: options.catalogUrl ?? "",
      assetName,
    };
  }

  const { releases } = await fetchHubOsCatalog({
    fetchImpl: options.fetchImpl,
    signal: options.signal,
    catalogUrl: options.catalogUrl,
  });
  const release = options.version
    ? findHubOsReleaseByVersion(releases, options.version)
    : pickLatestHubOsRelease(releases);
  if (!release) {
    throw Object.assign(new Error(`Control Hub OS version not found: ${options.version}`), {
      code: "HUB_UPDATE_CATALOG_EMPTY",
    });
  }
  return release;
}
