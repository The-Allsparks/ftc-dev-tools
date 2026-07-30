import path from "node:path";
import type { FetchLike } from "../../sdk/types.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import { discoverVisionWorkspace } from "../discover.js";
import { extractWebcamDevicesFromXml } from "../endpoints/discover-devices.js";
import { probeVisionEndpoint } from "../endpoints/probe.js";
import type { VisionEndpointCandidate, VisionEndpointReachability } from "../endpoints/types.js";
import { detectFtcDashboardDependency } from "./detect-dependency.js";
import { resolveDashboardUrlReport } from "./resolve-url.js";
import type { FtcDashboardStatusReport } from "./types.js";
import fs from "node:fs/promises";

export interface GetFtcDashboardStatusOptions {
  url?: string;
  host?: string;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  probeNetwork?: boolean;
  fetchImpl?: FetchLike;
}

const GAMEPAD_WARNING =
  "FTC Dashboard gamepad controls are for development only — do not use them as a competition Driver Station substitute.";
const CAMERA_BANDWIDTH_WARNING =
  "Camera streams in FTC Dashboard can use significant Wi-Fi bandwidth; prefer USB debugging or wired networks when possible.";

const SERVER_VERSION_PATTERN =
  /(?:ftc-dashboard|FTC Dashboard)[^0-9]{0,24}([0-9]+(?:\.[0-9A-Za-z-]+)+)/i;

async function robotConfigHasWebcam(projectRoot: string): Promise<boolean> {
  const xmlPath = path.join(projectRoot, "TeamCode", "src", "main", "res", "xml");
  let entries;
  try {
    entries = await fs.readdir(xmlPath);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".xml")) {
      continue;
    }
    try {
      const xml = await fs.readFile(path.join(xmlPath, entry), "utf8");
      if (extractWebcamDevicesFromXml(xml).length > 0) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function cameraStreamLikely(
  workspaceSignals: Awaited<ReturnType<typeof discoverVisionWorkspace>>,
  hasWebcam: boolean,
): boolean {
  if (hasWebcam) {
    return true;
  }
  return workspaceSignals.signals.some((signal) =>
    ["visionportal", "easyopencv", "limelight"].includes(signal.kind),
  );
}

async function probeDashboardHtml(
  url: string,
  fetchImpl: FetchLike | undefined,
  timeoutMs = 3_000,
): Promise<{ statusCode?: number; serverVersion?: string }> {
  const fetchFn = fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!fetchFn) {
    return {};
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, {
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
      signal: controller.signal,
    });
    const text = await response.text();
    const versionMatch = text.match(SERVER_VERSION_PATTERN);
    return {
      statusCode: response.status,
      serverVersion: versionMatch?.[1],
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function getFtcDashboardStatus(
  projectRoot: string,
  options: GetFtcDashboardStatusOptions = {},
): Promise<FtcDashboardStatusReport> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const dependency = await detectFtcDashboardDependency(root);
  const workspace = await discoverVisionWorkspace(root);
  const hasWebcam = await robotConfigHasWebcam(root);
  const cameraStreamLikelyFlag = cameraStreamLikely(workspace, hasWebcam);

  const detected =
    dependency.detected || workspace.signals.some((signal) => signal.kind === "ftc-dashboard");

  const warnings: string[] = [GAMEPAD_WARNING];
  if (cameraStreamLikelyFlag) {
    warnings.push(CAMERA_BANDWIDTH_WARNING);
  }
  if (!detected) {
    warnings.push(
      "FTC Dashboard dependency not detected in this project. Dashboard may still be reachable if installed manually on the robot.",
    );
  }

  const urlResolution = await resolveDashboardUrlReport(root, {
    explicitUrl: options.url,
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });

  let reachable: VisionEndpointReachability | undefined;
  let statusCode: number | undefined;
  let detectedServerVersion: string | undefined;

  if (urlResolution.url && options.probeNetwork !== false) {
    const candidate: VisionEndpointCandidate = {
      id: `ftc-dashboard:status:${urlResolution.url}`,
      kind: "ftc-dashboard",
      providerId: "telemetry:ftc-dashboard",
      location: "desktop-reachable",
      sources: ["project-config"],
      confidence: "high",
      evidence: ["Status probe"],
      url: urlResolution.url,
    };
    const probe = await probeVisionEndpoint(candidate, {
      fetchImpl: options.fetchImpl,
      timeoutMs: 3_000,
    });
    reachable = probe.reachable;
    statusCode = probe.statusCode;

    if (probe.reachable === "reachable") {
      const htmlProbe = await probeDashboardHtml(urlResolution.url, options.fetchImpl);
      statusCode = htmlProbe.statusCode ?? statusCode;
      detectedServerVersion = htmlProbe.serverVersion;
    }
  }

  const humanSummary: string[] = [];
  if (dependency.detected) {
    humanSummary.push(
      dependency.version
        ? `Project dependency: FTC Dashboard ${dependency.version}`
        : "Project dependency: FTC Dashboard detected",
    );
  } else {
    humanSummary.push("Project dependency: not detected");
  }
  if (urlResolution.url) {
    humanSummary.push(`URL: ${urlResolution.url} (${urlResolution.source ?? "unknown"})`);
    if (reachable) {
      humanSummary.push(`Reachability: ${reachable}${statusCode ? ` (HTTP ${statusCode})` : ""}`);
    }
    if (detectedServerVersion) {
      humanSummary.push(`Server-reported version: ${detectedServerVersion}`);
    }
  } else {
    humanSummary.push("URL: not resolved — connect to the robot or set vision.dashboard.url");
  }
  if (cameraStreamLikelyFlag) {
    humanSummary.push("Camera stream: likely available (vision or webcam configured)");
  }

  let message: string;
  if (!detected && !urlResolution.url) {
    message = "FTC Dashboard is not detected in this project and no URL could be resolved.";
  } else if (urlResolution.requiresSelection) {
    message = urlResolution.message;
  } else if (reachable === "reachable") {
    message = `FTC Dashboard is reachable at ${urlResolution.url}.`;
  } else if (urlResolution.url) {
    message = `FTC Dashboard URL resolved (${urlResolution.url}) but reachability is ${reachable ?? "unknown"}.`;
  } else {
    message = "FTC Dashboard status collected.";
  }

  return {
    projectRoot: root,
    detected,
    dependency,
    url: urlResolution.url,
    urlResolution,
    reachable,
    statusCode,
    detectedServerVersion,
    cameraStreamLikely: cameraStreamLikelyFlag,
    warnings,
    humanSummary,
    message,
    generatedAt,
  };
}
