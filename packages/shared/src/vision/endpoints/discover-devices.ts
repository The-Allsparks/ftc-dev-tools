import path from "node:path";
import { loadProjectConfig } from "../../config/load.js";
import { listRobotConfigs, showRobotConfig } from "../../robot-config/list.js";
import { parseRobotConfigXml } from "../../robot-config/parse.js";
import { DEFAULT_CONTROL_HUB_HOST, DEFAULT_ROBOT_CONSOLE_URL } from "../../wifi/defaults.js";
import type { AndroidDevice, DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";
import type { FetchLike } from "../../sdk/types.js";
import { isRobotRoutePresent } from "../../wifi/robot-route.js";
import { DEFAULT_ROBOT_SUBNET_CIDR } from "../../wifi/defaults.js";
import { discoverVisionWorkspace } from "../discover.js";
import { visionConfigFromProjectConfig } from "../status.js";
import { probeVisionEndpoints } from "./probe.js";
import { teamNumberToLimelightHost, wifiSerialToHost } from "./team-ip.js";
import type {
  DiscoverVisionDevicesOptions,
  VisionDevicesReport,
  VisionEndpointCandidate,
  VisionEndpointDescriptor,
  VisionEndpointSource,
} from "./types.js";

export interface DiscoverVisionDevicesFullOptions extends DiscoverVisionDevicesOptions {
  deviceProvider?: DeviceProvider;
  fetchImpl?: FetchLike;
  runner?: ProcessRunner;
  platform?: NodeJS.Platform;
}

const WEBCAM_DEVICE_TYPES = new Set(["webcam", "webcamname"]);

function endpointId(
  kind: string,
  host: string | undefined,
  port: number | undefined,
  suffix = "",
): string {
  if (!host) {
    return `${kind}:config-only${suffix ? `:${suffix}` : ""}`;
  }
  return `${kind}:${host}:${port ?? "default"}${suffix ? `:${suffix}` : ""}`;
}

function addCandidate(
  map: Map<string, VisionEndpointCandidate>,
  candidate: VisionEndpointCandidate,
): void {
  const existing = map.get(candidate.id);
  if (!existing) {
    map.set(candidate.id, {
      ...candidate,
      sources: [...candidate.sources],
      evidence: [...candidate.evidence],
    });
    return;
  }
  for (const source of candidate.sources) {
    if (!existing.sources.includes(source)) {
      existing.sources.push(source);
    }
  }
  for (const line of candidate.evidence) {
    if (!existing.evidence.includes(line)) {
      existing.evidence.push(line);
    }
  }
  if (
    candidate.confidence === "high" ||
    (candidate.confidence === "medium" && existing.confidence === "low")
  ) {
    existing.confidence = candidate.confidence;
  }
  if (candidate.deviceSerial && !existing.deviceSerial) {
    existing.deviceSerial = candidate.deviceSerial;
  }
  if (candidate.configDeviceName && !existing.configDeviceName) {
    existing.configDeviceName = candidate.configDeviceName;
  }
  if (candidate.robotConfigName && !existing.robotConfigName) {
    existing.robotConfigName = candidate.robotConfigName;
  }
}

function addLimelightCandidates(
  map: Map<string, VisionEndpointCandidate>,
  host: string,
  sources: VisionEndpointSource[],
  confidence: VisionEndpointCandidate["confidence"],
  evidence: string[],
  location: VisionEndpointCandidate["location"] = "desktop-reachable",
  deviceSerial?: string,
): void {
  const entries: Array<{
    kind: VisionEndpointCandidate["kind"];
    port: number;
    path?: string;
    providerId: string;
  }> = [
    { kind: "limelight-web", port: 5801, providerId: "vision:limelight" },
    { kind: "limelight-stream", port: 5800, providerId: "frame:limelight" },
    { kind: "limelight-api", port: 5807, path: "/status", providerId: "vision:limelight" },
  ];

  for (const entry of entries) {
    addCandidate(map, {
      id: endpointId(entry.kind, host, entry.port),
      kind: entry.kind,
      providerId: entry.providerId,
      location,
      sources,
      confidence,
      evidence,
      host,
      port: entry.port,
      path: entry.path,
      url: `http://${host}:${entry.port}${entry.path ?? ""}`,
      deviceSerial,
    });
  }
}

function collectRobotHosts(devices: AndroidDevice[]): string[] {
  const hosts = new Set<string>();
  for (const device of devices) {
    if (device.connectionType === "wifi") {
      const host = wifiSerialToHost(device.serial);
      if (host) {
        hosts.add(host);
      }
    }
  }
  if (hosts.size === 0) {
    hosts.add(DEFAULT_CONTROL_HUB_HOST);
  }
  return [...hosts];
}

async function collectRobotConfigWebcams(
  projectRoot: string,
): Promise<Array<{ configName: string; deviceName: string; relativePath: string }>> {
  const listed = await listRobotConfigs(projectRoot);
  const webcams: Array<{ configName: string; deviceName: string; relativePath: string }> = [];

  for (const config of listed.configs) {
    const detail = await showRobotConfig(projectRoot, config.name);
    if (!detail.success || !detail.config) {
      continue;
    }
    for (const device of detail.config.devices) {
      if (!WEBCAM_DEVICE_TYPES.has(device.type.toLowerCase())) {
        continue;
      }
      webcams.push({
        configName: detail.config.name,
        deviceName: device.name,
        relativePath: detail.config.relativePath,
      });
    }
  }

  return webcams;
}

async function buildCandidates(
  projectRoot: string,
  devices: AndroidDevice[],
  robotRoutePresent: boolean | undefined,
): Promise<{ map: Map<string, VisionEndpointCandidate>; workspaceSignalKinds: string[] }> {
  const map = new Map<string, VisionEndpointCandidate>();
  const root = path.resolve(projectRoot);

  const configResult = await loadProjectConfig(root);
  const visionConfig = visionConfigFromProjectConfig(configResult.config.vision);
  const teamNumber = configResult.config.teamNumber;

  const workspace = await discoverVisionWorkspace(root);
  const workspaceKinds = new Set(workspace.signals.map((signal) => signal.kind));
  const workspaceSignalKinds = workspace.signals.map((signal) => signal.kind);

  if (visionConfig.limelight?.host) {
    addLimelightCandidates(map, visionConfig.limelight.host, ["project-config"], "high", [
      `vision.limelight.host in ${configResult.path ?? ".ftc-dev.json"}`,
    ]);
  }

  if (teamNumber) {
    const host = teamNumberToLimelightHost(teamNumber);
    if (host) {
      addLimelightCandidates(map, host, ["team-number-heuristic"], "low", [
        `Team number ${teamNumber} → heuristic Limelight host ${host}`,
      ]);
    }
  }

  addLimelightCandidates(map, "limelight.local", ["default-hostname"], "medium", [
    "Default mDNS hostname limelight.local",
  ]);

  const robotHosts = collectRobotHosts(devices);
  for (const host of robotHosts) {
    if (workspaceKinds.has("ftc-dashboard")) {
      addCandidate(map, {
        id: endpointId("ftc-dashboard", host, 8080, "/dash"),
        kind: "ftc-dashboard",
        providerId: "telemetry:ftc-dashboard",
        location: "desktop-reachable",
        sources: devices.some((device) => wifiSerialToHost(device.serial) === host)
          ? ["connected-device", "workspace-signal"]
          : ["workspace-signal", "robot-route"],
        confidence: devices.some((device) => wifiSerialToHost(device.serial) === host)
          ? "high"
          : "medium",
        evidence: [
          `FTC Dashboard at http://${host}:8080/dash`,
          "Detected ftc-dashboard dependency or import in workspace",
        ],
        host,
        port: 8080,
        path: "/dash",
        url: `http://${host}:8080/dash`,
        deviceSerial: devices.find((device) => wifiSerialToHost(device.serial) === host)?.serial,
      });
    }

    addCandidate(map, {
      id: endpointId("robot-console", host, 8080),
      kind: "robot-console",
      providerId: "vision:visionportal",
      location: "desktop-reachable",
      sources: robotRoutePresent ? ["robot-route", "connected-device"] : ["connected-device"],
      confidence: robotRoutePresent ? "medium" : "low",
      evidence: [`Robot Controller Console at http://${host}:8080`],
      host,
      port: 8080,
      url: `http://${host}:8080`,
      deviceSerial: devices.find((device) => wifiSerialToHost(device.serial) === host)?.serial,
    });
  }

  if (
    robotRoutePresent &&
    robotHosts.length === 1 &&
    !robotHosts.includes(DEFAULT_CONTROL_HUB_HOST)
  ) {
    // already covered via connected device hosts
  } else if (robotRoutePresent) {
    const defaultHost = DEFAULT_CONTROL_HUB_HOST;
    if (!robotHosts.includes(defaultHost)) {
      addCandidate(map, {
        id: endpointId("robot-console", defaultHost, 8080),
        kind: "robot-console",
        providerId: "vision:visionportal",
        location: "desktop-reachable",
        sources: ["robot-route"],
        confidence: "medium",
        evidence: [`Robot route present; default Control Hub console ${DEFAULT_ROBOT_CONSOLE_URL}`],
        host: defaultHost,
        port: 8080,
        url: DEFAULT_ROBOT_CONSOLE_URL,
      });
    }
  }

  const webcams = await collectRobotConfigWebcams(root);
  for (const webcam of webcams) {
    addCandidate(map, {
      id: endpointId("webcam-config", undefined, undefined, webcam.deviceName),
      kind: "webcam-config",
      providerId: "vision:visionportal",
      location: "robot-side",
      sources: ["robot-config"],
      confidence: "high",
      evidence: [`WebcamName "${webcam.deviceName}" in robot config ${webcam.relativePath}`],
      configDeviceName: webcam.deviceName,
      robotConfigName: webcam.configName,
    });
  }

  if (workspaceKinds.has("visionportal")) {
    addCandidate(map, {
      id: endpointId("visionportal-robot", undefined, undefined, "workspace"),
      kind: "visionportal-robot",
      providerId: "vision:visionportal",
      location: "robot-side",
      sources: ["workspace-signal"],
      confidence: "medium",
      evidence: ["VisionPortal import detected in TeamCode"],
    });
  }

  if (workspaceKinds.has("easyopencv")) {
    addCandidate(map, {
      id: endpointId("visionportal-robot", undefined, undefined, "easyopencv"),
      kind: "visionportal-robot",
      providerId: "vision:easyopencv",
      location: "robot-side",
      sources: ["workspace-signal"],
      confidence: "medium",
      evidence: ["EasyOpenCV dependency or import detected in workspace"],
    });
  }

  if (workspaceKinds.has("limelight") && !visionConfig.limelight?.host) {
    for (const host of [
      "limelight.local",
      ...(teamNumber ? [teamNumberToLimelightHost(teamNumber)].filter(Boolean) : []),
    ]) {
      if (host) {
        addLimelightCandidates(
          map,
          host,
          ["workspace-signal"],
          host === "limelight.local" ? "medium" : "low",
          ["Limelight reference detected in TeamCode or Gradle"],
        );
      }
    }
  }

  return { map, workspaceSignalKinds };
}

function analyzeSelection(
  endpoints: VisionEndpointDescriptor[],
  devices: AndroidDevice[],
): { requiresSelection: boolean; selectionReasons: string[] } {
  const reasons: string[] = [];
  const wifiDevices = devices.filter((device) => device.connectionType === "wifi");
  if (wifiDevices.length > 1) {
    reasons.push(
      `Multiple wireless adb devices connected (${wifiDevices.map((device) => device.serial).join(", ")}); no device was auto-selected.`,
    );
  }

  const reachableRobotHosts = new Set(
    endpoints
      .filter(
        (endpoint) =>
          endpoint.probe.reachable === "reachable" &&
          (endpoint.kind === "robot-console" || endpoint.kind === "ftc-dashboard"),
      )
      .map((endpoint) => endpoint.host)
      .filter((host): host is string => Boolean(host)),
  );
  if (reachableRobotHosts.size > 1) {
    reasons.push(`Multiple reachable robot hosts: ${[...reachableRobotHosts].join(", ")}.`);
  }

  const reachableLimelightHosts = new Set(
    endpoints
      .filter(
        (endpoint) =>
          endpoint.kind.startsWith("limelight") &&
          endpoint.probe.reachable === "reachable" &&
          endpoint.host,
      )
      .map((endpoint) => endpoint.host as string),
  );
  if (reachableLimelightHosts.size > 1) {
    reasons.push(`Multiple reachable Limelight hosts: ${[...reachableLimelightHosts].join(", ")}.`);
  }

  return {
    requiresSelection: reasons.length > 0,
    selectionReasons: reasons,
  };
}

function buildMessage(endpoints: VisionEndpointDescriptor[], requiresSelection: boolean): string {
  const reachable = endpoints.filter((endpoint) => endpoint.probe.reachable === "reachable").length;
  const configOnly = endpoints.filter(
    (endpoint) => endpoint.location === "config-only" || endpoint.probe.reachable === "not-probed",
  ).length;
  const parts = [
    `Discovered ${endpoints.length} vision endpoint(s)`,
    reachable > 0 ? `${reachable} reachable on the network` : "none reachable on the network",
    configOnly > 0 ? `${configOnly} config/robot-side only` : undefined,
    requiresSelection ? "explicit selection required" : undefined,
  ].filter(Boolean);
  return `${parts.join("; ")}.`;
}

export async function discoverVisionDevices(
  projectRoot: string,
  options: DiscoverVisionDevicesFullOptions = {},
): Promise<VisionDevicesReport> {
  const root = path.resolve(projectRoot);
  const warnings: string[] = [];
  let devices: AndroidDevice[] = [];

  if (options.deviceProvider) {
    try {
      devices = await options.deviceProvider.listDevices();
    } catch (error) {
      warnings.push(
        `Could not list connected devices: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let robotRoutePresent: boolean | undefined;
  if (options.runner) {
    try {
      robotRoutePresent = await isRobotRoutePresent(
        options.runner,
        DEFAULT_ROBOT_SUBNET_CIDR,
        options.platform ?? process.platform,
      );
    } catch {
      robotRoutePresent = undefined;
    }
  }

  const { map: candidateMap, workspaceSignalKinds } = await buildCandidates(
    root,
    devices,
    robotRoutePresent,
  );
  const candidates = [...candidateMap.values()];

  const probed = await probeVisionEndpoints(candidates, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
    probeNetwork: options.probeNetwork,
  });

  const endpoints: VisionEndpointDescriptor[] = probed.map(({ candidate, probe }) => ({
    ...candidate,
    probe,
  }));

  endpoints.sort((a, b) => {
    const kind = a.kind.localeCompare(b.kind);
    if (kind !== 0) {
      return kind;
    }
    return (a.host ?? "").localeCompare(b.host ?? "");
  });

  const webcams = endpoints
    .filter((endpoint) => endpoint.kind === "webcam-config")
    .map((endpoint) => endpoint.configDeviceName ?? endpoint.id);

  const { requiresSelection, selectionReasons } = analyzeSelection(endpoints, devices);

  return {
    projectRoot: root,
    endpoints,
    context: {
      connectedDevices: devices.map((device) => ({
        serial: device.serial,
        connectionType: device.connectionType,
        host: wifiSerialToHost(device.serial),
      })),
      robotRoutePresent,
      workspaceSignals: workspaceSignalKinds,
      robotConfigWebcams: webcams.filter((name): name is string => Boolean(name)),
    },
    requiresSelection,
    selectionReasons,
    warnings,
    message: buildMessage(endpoints, requiresSelection),
    generatedAt: new Date().toISOString(),
  };
}

/** Exported for tests — parse robot config XML webcam entries. */
export function extractWebcamDevicesFromXml(xml: string): string[] {
  return parseRobotConfigXml(xml)
    .devices.filter((device) => WEBCAM_DEVICE_TYPES.has(device.type.toLowerCase()))
    .map((device) => device.name);
}
