/** Vision endpoint and service discovery types (VISION-03). */

export type VisionEndpointKind =
  | "limelight-web"
  | "limelight-api"
  | "limelight-stream"
  | "ftc-dashboard"
  | "robot-console"
  | "webcam-config"
  | "visionportal-robot";

export type VisionEndpointLocation = "robot-side" | "desktop-reachable" | "config-only";

export type VisionEndpointSource =
  | "project-config"
  | "robot-config"
  | "workspace-signal"
  | "team-number-heuristic"
  | "connected-device"
  | "default-hostname"
  | "robot-route";

export type VisionEndpointConfidence = "high" | "medium" | "low";

export type VisionEndpointReachability = "reachable" | "unreachable" | "not-probed" | "skipped";

export interface VisionEndpointCandidate {
  /** Stable dedupe key (host:port:kind or config-only id). */
  id: string;
  kind: VisionEndpointKind;
  providerId: string;
  location: VisionEndpointLocation;
  sources: VisionEndpointSource[];
  confidence: VisionEndpointConfidence;
  evidence: string[];
  host?: string;
  port?: number;
  path?: string;
  url?: string;
  deviceSerial?: string;
  configDeviceName?: string;
  robotConfigName?: string;
}

export interface VisionEndpointProbeResult {
  reachable: VisionEndpointReachability;
  statusCode?: number;
  message: string;
  probedAt?: string;
}

export interface VisionEndpointDescriptor extends VisionEndpointCandidate {
  probe: VisionEndpointProbeResult;
}

export interface VisionDevicesDiscoveryContext {
  connectedDevices: Array<{ serial: string; connectionType: string; host?: string }>;
  robotRoutePresent?: boolean;
  workspaceSignals: string[];
  robotConfigWebcams: string[];
}

export interface VisionDevicesReport {
  projectRoot: string;
  endpoints: VisionEndpointDescriptor[];
  context: VisionDevicesDiscoveryContext;
  /** True when multiple robot hosts or ambiguous device selection is detected. */
  requiresSelection: boolean;
  selectionReasons: string[];
  warnings: string[];
  message: string;
  generatedAt: string;
}

export interface DiscoverVisionDevicesOptions {
  probeNetwork?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}
