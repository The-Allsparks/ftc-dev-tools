import path from "node:path";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import { discoverVisionDevices } from "../endpoints/discover-devices.js";
import { redactVisionCliPayload } from "../cli/format.js";
import type { ResolveVisionEndpointResult, VisionMcpSanitizeOptions } from "./types.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "wifiPassword",
  "secret",
  "token",
  "credential",
  "credentials",
]);

function truncateStrings(value: unknown, maxLength: number): unknown {
  if (typeof value === "string") {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…[truncated]` : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => truncateStrings(entry, maxLength));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        continue;
      }
      out[key] = truncateStrings(nested, maxLength);
    }
    return out;
  }
  return value;
}

/** Limit MCP vision payloads — no credentials, truncated strings, optional redaction. */
export function sanitizeVisionMcpPayload<T>(payload: T, options: VisionMcpSanitizeOptions = {}): T {
  const maxLength = options.maxStringLength ?? 8_192;
  let sanitized = truncateStrings(payload, maxLength) as T;
  if (options.redact) {
    sanitized = redactVisionCliPayload(sanitized) as T;
  }
  return sanitized;
}

export async function resolveVisionEndpoint(
  projectRoot: string,
  endpointId: string,
  options: {
    deviceProvider?: DeviceProvider;
    runner?: ProcessRunner;
    platform?: NodeJS.Platform;
  } = {},
): Promise<ResolveVisionEndpointResult | undefined> {
  const report = await discoverVisionDevices(path.resolve(projectRoot), {
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    platform: options.platform,
    probeNetwork: false,
  });
  const match = report.endpoints.find((endpoint) => endpoint.id === endpointId);
  if (!match) {
    return undefined;
  }
  return {
    endpointId: match.id,
    host: match.host,
    url: match.url,
    providerId: match.providerId,
  };
}

export function hostFromVisionTarget(args: {
  endpointId?: string;
  host?: string;
  resolved?: ResolveVisionEndpointResult;
}): string | undefined {
  if (args.host?.trim()) {
    return args.host.trim();
  }
  return args.resolved?.host;
}
