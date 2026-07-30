import type { FetchLike } from "../../sdk/types.js";
import type { VisionEndpointCandidate, VisionEndpointProbeResult } from "./types.js";

export interface ProbeVisionEndpointOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function mergeAbortSignals(signals: AbortSignal[]): AbortController {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller;
}

async function probeUrl(
  url: string,
  options: ProbeVisionEndpointOptions,
  accept = "application/json,text/html,*/*",
): Promise<VisionEndpointProbeResult> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!fetchImpl) {
    return {
      reachable: "skipped",
      message: "fetch is not available; network probe skipped.",
    };
  }

  const controller = mergeAbortSignals(
    [options.signal].filter((signal): signal is AbortSignal => signal !== undefined),
  );
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 3_000);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: accept },
      signal: controller.signal,
    });
    const reachable = response.ok || response.status < 500 ? "reachable" : "unreachable";
    return {
      reachable,
      statusCode: response.status,
      message:
        reachable === "reachable"
          ? `Responded with HTTP ${response.status}.`
          : `Returned HTTP ${response.status}.`,
      probedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      reachable: "unreachable",
      message: `Unreachable: ${message}`,
      probedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildUrl(candidate: VisionEndpointCandidate): string | undefined {
  if (candidate.url) {
    return candidate.url;
  }
  if (!candidate.host) {
    return undefined;
  }
  const port = candidate.port ?? 80;
  const path = candidate.path ?? "";
  return `http://${candidate.host}:${port}${path}`;
}

export async function probeVisionEndpoint(
  candidate: VisionEndpointCandidate,
  options: ProbeVisionEndpointOptions = {},
): Promise<VisionEndpointProbeResult> {
  if (candidate.location === "config-only" || candidate.location === "robot-side") {
    return {
      reachable: "not-probed",
      message:
        candidate.location === "config-only"
          ? "Config-defined endpoint; no network probe performed."
          : "Robot-side endpoint; desktop reachability not probed.",
    };
  }

  const url = buildUrl(candidate);
  if (!url) {
    return {
      reachable: "skipped",
      message: "No URL available for probing.",
    };
  }

  switch (candidate.kind) {
    case "limelight-api":
      return probeUrl(`${url.replace(/\/$/, "")}/status`, options);
    case "limelight-web":
      return probeUrl(url, options, "text/html,application/xhtml+xml,*/*");
    case "limelight-stream":
      return probeUrl(url, options, "multipart/x-mixed-replace,*/*");
    case "ftc-dashboard":
      return probeUrl(url, options, "text/html,application/xhtml+xml,*/*");
    case "robot-console":
      return probeUrl(url, options, "text/html,application/xhtml+xml,*/*");
    default:
      return {
        reachable: "skipped",
        message: `No probe strategy for kind "${candidate.kind}".`,
      };
  }
}

export async function probeVisionEndpoints(
  candidates: VisionEndpointCandidate[],
  options: ProbeVisionEndpointOptions & { probeNetwork?: boolean } = {},
): Promise<Array<{ candidate: VisionEndpointCandidate; probe: VisionEndpointProbeResult }>> {
  if (options.probeNetwork === false) {
    return candidates.map((candidate) => ({
      candidate,
      probe: {
        reachable: "skipped",
        message: "Network probing disabled.",
      },
    }));
  }

  const results = await Promise.allSettled(
    candidates.map(async (candidate) => ({
      candidate,
      probe: await probeVisionEndpoint(candidate, options),
    })),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const candidate = candidates[index]!;
    return {
      candidate,
      probe: {
        reachable: "unreachable" as const,
        message: `Probe failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        probedAt: new Date().toISOString(),
      },
    };
  });
}
