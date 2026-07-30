import type { FetchLike } from "../../sdk/types.js";
import { DEFAULT_LIMELIGHT_API_PORT, limelightApiBaseUrl } from "./constants.js";

export interface LimelightHttpOptions {
  host: string;
  port?: number;
  path: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LimelightHttpResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  url: string;
  data?: T;
  text?: string;
  message: string;
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

export async function limelightHttpGet<T = Record<string, unknown>>(
  options: LimelightHttpOptions,
): Promise<LimelightHttpResponse<T>> {
  const port = options.port ?? DEFAULT_LIMELIGHT_API_PORT;
  const url = `${limelightApiBaseUrl(options.host, port)}${options.path.startsWith("/") ? options.path : `/${options.path}`}`;
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!fetchImpl) {
    return {
      ok: false,
      status: 0,
      url,
      message: "fetch is not available; cannot query Limelight Vision API.",
    };
  }

  const controller = mergeAbortSignals(
    [options.signal].filter((signal): signal is AbortSignal => signal !== undefined),
  );
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let data: T | undefined;
    if (text.trim()) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        return {
          ok: false,
          status: response.status,
          url,
          text,
          message: "Limelight Vision returned non-JSON response.",
        };
      }
    }
    const ok = response.ok;
    return {
      ok,
      status: response.status,
      url,
      data,
      text,
      message: ok
        ? `Limelight Vision responded (${response.status}).`
        : `Limelight Vision returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 0,
      url,
      message: `Limelight Vision unreachable at ${url}: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
