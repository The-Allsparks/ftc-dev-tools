/**
 * Provider registry types (ADR-0004).
 * Capabilities register providers; consumers resolve by id without cross-module imports.
 */

/** Where frame data originates. */
export type FrameSourceKind = "hardware" | "simulation" | "replay" | "file" | "network";

export interface FrameProviderDescriptor {
  id: string;
  displayName: string;
  source: FrameSourceKind;
  /** Links to integration registry id when applicable */
  integrationId?: string;
  summary: string;
}

export type TelemetrySourceKind = "robot" | "dashboard" | "logcat" | "replay";

export interface TelemetryProviderDescriptor {
  id: string;
  displayName: string;
  source: TelemetrySourceKind;
  integrationId?: string;
  summary: string;
}

export interface SimulationRuntimeDescriptor {
  id: string;
  displayName: string;
  integrationId?: string;
  summary: string;
  /** When true, runtime exposes virtual frame providers */
  exposesVirtualCameras: boolean;
}

export type ReplayBackendKind = "file" | "live-capture";

export interface ReplayBackendDescriptor {
  id: string;
  displayName: string;
  kind: ReplayBackendKind;
  summary: string;
}

/** Vision-specific provider metadata (VISION-01). Consumes frame providers by reference. */
export type VisionProviderKind =
  "visionportal" | "limelight" | "easyopencv" | "sim-virtual" | "replay-file";

export interface VisionProviderDescriptor {
  id: string;
  displayName: string;
  kind: VisionProviderKind;
  integrationId: string;
  /** Frame provider this vision source reads from (ADR-0004 decoupling) */
  frameProviderId: string;
  summary: string;
  experimental?: boolean;
}

export interface ProviderRegistrySnapshot {
  generatedAt: string;
  frameProviders: FrameProviderDescriptor[];
  telemetryProviders: TelemetryProviderDescriptor[];
  simulationRuntimes: SimulationRuntimeDescriptor[];
  replayBackends: ReplayBackendDescriptor[];
  visionProviders: VisionProviderDescriptor[];
}
