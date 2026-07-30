import path from "node:path";
import { loadProjectConfig } from "../../config/load.js";
import { discoverVisionDevices } from "../endpoints/discover-devices.js";
import { visionConfigFromProjectConfig } from "../status.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import { buildFtcDashboardUrl } from "./constants.js";
import type {
  DashboardUrlCandidate,
  ResolveDashboardUrlReport,
  ResolveDashboardUrlResult,
} from "./types.js";

export interface ResolveDashboardUrlOptions {
  explicitUrl?: string;
  explicitHost?: string;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  probeNetwork?: boolean;
}

function normalizeDashboardUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return buildFtcDashboardUrl(trimmed);
}

export async function resolveDashboardUrl(
  projectRoot: string,
  options: ResolveDashboardUrlOptions = {},
): Promise<ResolveDashboardUrlResult> {
  const report = await resolveDashboardUrlReport(projectRoot, options);
  if (report.requiresSelection || !report.url) {
    throw Object.assign(new Error(report.message), {
      code: "DASHBOARD_URL_AMBIGUOUS",
      report,
    });
  }
  return {
    url: report.url,
    source: report.source!,
    evidence: report.evidence ?? report.message,
  };
}

export async function resolveDashboardUrlReport(
  projectRoot: string,
  options: ResolveDashboardUrlOptions = {},
): Promise<ResolveDashboardUrlReport> {
  const root = path.resolve(projectRoot);

  if (options.explicitUrl?.trim()) {
    const url = normalizeDashboardUrl(options.explicitUrl.trim());
    return {
      url,
      source: "explicit",
      evidence: `Explicit --url ${url}`,
      candidates: [{ url, reachable: true, evidence: "explicit" }],
      requiresSelection: false,
      message: `Using explicit FTC Dashboard URL ${url}.`,
    };
  }

  if (options.explicitHost?.trim()) {
    const url = buildFtcDashboardUrl(options.explicitHost.trim());
    return {
      url,
      source: "explicit",
      evidence: `Explicit --host ${options.explicitHost.trim()}`,
      candidates: [{ url, reachable: true, evidence: "explicit" }],
      requiresSelection: false,
      message: `Using explicit FTC Dashboard host ${options.explicitHost.trim()}.`,
    };
  }

  const configResult = await loadProjectConfig(root);
  const visionConfig = visionConfigFromProjectConfig(configResult.config.vision);
  if (visionConfig.dashboard?.url?.trim()) {
    const url = normalizeDashboardUrl(visionConfig.dashboard.url.trim());
    return {
      url,
      source: "project-config",
      evidence: `vision.dashboard.url in ${configResult.path ?? ".ftc-dev.json"}`,
      candidates: [{ url, reachable: true, evidence: "project-config" }],
      requiresSelection: false,
      message: `Using configured FTC Dashboard URL ${url}.`,
    };
  }

  const discovery = await discoverVisionDevices(root, {
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });

  const dashboardEndpoints = discovery.endpoints.filter(
    (endpoint) => endpoint.kind === "ftc-dashboard" && endpoint.url,
  );

  const reachable = dashboardEndpoints.filter(
    (endpoint) => endpoint.probe.reachable === "reachable" && endpoint.url,
  );
  const pool = reachable.length > 0 ? reachable : dashboardEndpoints;

  const candidates: DashboardUrlCandidate[] = pool.map((endpoint) => ({
    url: endpoint.url as string,
    reachable: endpoint.probe.reachable === "reachable",
    evidence: endpoint.evidence.join("; "),
  }));

  const uniqueUrls = [...new Set(candidates.map((candidate) => candidate.url))];

  if (uniqueUrls.length === 0) {
    return {
      candidates: [],
      requiresSelection: true,
      message:
        "No FTC Dashboard URL configured or discovered. Add the dashboard dependency, connect to the robot network, or set vision.dashboard.url in .ftc-dev.json.",
    };
  }

  if (uniqueUrls.length > 1 || discovery.requiresSelection) {
    const reasons = discovery.selectionReasons.length
      ? discovery.selectionReasons
      : [`Multiple FTC Dashboard URLs: ${uniqueUrls.join(", ")}.`];
    return {
      candidates,
      requiresSelection: true,
      message: `${reasons.join(" ")} Pass --url or --host to select a dashboard.`,
    };
  }

  const url = uniqueUrls[0]!;
  const hit = candidates.find((candidate) => candidate.url === url);
  return {
    url,
    source: "discovery",
    evidence: hit?.evidence ?? "Discovered reachable FTC Dashboard endpoint",
    candidates,
    requiresSelection: false,
    message: `Using discovered FTC Dashboard URL ${url}.`,
  };
}
