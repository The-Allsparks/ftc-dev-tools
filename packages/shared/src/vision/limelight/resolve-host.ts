import path from "node:path";
import { loadProjectConfig } from "../../config/load.js";
import { visionConfigFromProjectConfig } from "../status.js";
import { discoverVisionDevices } from "../endpoints/discover-devices.js";
import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import type { ResolveLimelightHostReport, ResolveLimelightHostResult } from "./types.js";

export interface ResolveLimelightHostOptions {
  explicitHost?: string;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  probeNetwork?: boolean;
}

export async function resolveLimelightHost(
  projectRoot: string,
  options: ResolveLimelightHostOptions = {},
): Promise<ResolveLimelightHostResult> {
  const report = await resolveLimelightHostReport(projectRoot, options);
  if (report.requiresSelection || !report.host) {
    throw Object.assign(new Error(report.message), {
      code: "LIMELIGHT_HOST_AMBIGUOUS",
      report,
    });
  }
  return {
    host: report.host,
    source: report.source!,
    evidence: report.evidence ?? report.message,
  };
}

export async function resolveLimelightHostReport(
  projectRoot: string,
  options: ResolveLimelightHostOptions = {},
): Promise<ResolveLimelightHostReport> {
  const root = path.resolve(projectRoot);

  if (options.explicitHost?.trim()) {
    return {
      host: options.explicitHost.trim(),
      source: "explicit",
      evidence: `Explicit --host ${options.explicitHost.trim()}`,
      candidates: [{ host: options.explicitHost.trim(), reachable: true, evidence: "explicit" }],
      requiresSelection: false,
      message: `Using explicit Limelight Vision host ${options.explicitHost.trim()}.`,
    };
  }

  const configResult = await loadProjectConfig(root);
  const visionConfig = visionConfigFromProjectConfig(configResult.config.vision);
  if (visionConfig.limelight?.host?.trim()) {
    const host = visionConfig.limelight.host.trim();
    return {
      host,
      source: "project-config",
      evidence: `vision.limelight.host in ${configResult.path ?? ".ftc-dev.json"}`,
      candidates: [{ host, reachable: true, evidence: "project-config" }],
      requiresSelection: false,
      message: `Using configured Limelight Vision host ${host}.`,
    };
  }

  const discovery = await discoverVisionDevices(root, {
    deviceProvider: options.deviceProvider,
    runner: options.runner,
    probeNetwork: options.probeNetwork ?? true,
  });

  const apiEndpoints = discovery.endpoints.filter(
    (endpoint) => endpoint.kind === "limelight-api" && endpoint.host,
  );

  const reachable = apiEndpoints.filter(
    (endpoint) => endpoint.probe.reachable === "reachable" && endpoint.host,
  );
  const pool = reachable.length > 0 ? reachable : apiEndpoints;

  const candidates = pool.map((endpoint) => ({
    host: endpoint.host as string,
    reachable: endpoint.probe.reachable === "reachable",
    evidence: endpoint.evidence.join("; "),
  }));

  const uniqueHosts = [...new Set(candidates.map((candidate) => candidate.host))];

  if (uniqueHosts.length === 0) {
    return {
      candidates: [],
      requiresSelection: true,
      message:
        "No Limelight Vision host configured or discovered. Set vision.limelight.host in .ftc-dev.json or pass --host.",
    };
  }

  if (uniqueHosts.length > 1 || discovery.requiresSelection) {
    const reasons = discovery.selectionReasons.length
      ? discovery.selectionReasons
      : [`Multiple Limelight Vision hosts: ${uniqueHosts.join(", ")}.`];
    return {
      candidates,
      requiresSelection: true,
      message: `${reasons.join(" ")} Pass --host to select a camera.`,
    };
  }

  const host = uniqueHosts[0]!;
  const hit = candidates.find((candidate) => candidate.host === host);
  return {
    host,
    source: "discovery",
    evidence: hit?.evidence ?? "Discovered reachable Limelight Vision API endpoint",
    candidates,
    requiresSelection: false,
    message: `Using discovered Limelight Vision host ${host}.`,
  };
}
