import { DEFAULT_ROBOT_CONSOLE_URL } from "./defaults.js";
import type { ConsoleProbeResult, FetchLike } from "./types.js";

export interface ProbeConsoleOptions {
  url?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function probeRobotConsole(
  options: ProbeConsoleOptions = {},
): Promise<ConsoleProbeResult> {
  const url = options.url ?? DEFAULT_ROBOT_CONSOLE_URL;
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    return {
      url,
      reachable: false,
      message: "fetch is not available; cannot probe Robot Controller Console.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    const reachable = response.ok || response.status < 500;
    return {
      url,
      reachable,
      statusCode: response.status,
      message: reachable
        ? `Robot Controller Console responded (${response.status}).`
        : `Robot Controller Console returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      url,
      reachable: false,
      message: `Robot Controller Console unreachable: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
