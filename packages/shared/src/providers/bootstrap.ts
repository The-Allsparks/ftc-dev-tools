import {
  clearFrameProviders,
  listFrameProviders,
  registerFrameProvider,
} from "./frame-registry.js";
import {
  clearReplayBackends,
  listReplayBackends,
  registerReplayBackend,
} from "./replay-registry.js";
import {
  clearSimulationRuntimes,
  listSimulationRuntimes,
  registerSimulationRuntime,
} from "./simulation-registry.js";
import {
  clearTelemetryProviders,
  listTelemetryProviders,
  registerTelemetryProvider,
} from "./telemetry-registry.js";
import type { ProviderRegistrySnapshot } from "./types.js";
import {
  clearVisionProviders,
  listVisionProviders,
  registerVisionProvider,
} from "./vision-registry.js";

let bootstrapped = false;

/** Seed catalog descriptors for documentation and discovery. Idempotent. */
export function bootstrapProviderCatalog(): void {
  if (bootstrapped) {
    return;
  }
  bootstrapped = true;

  registerFrameProvider({
    id: "frame:visionportal",
    displayName: "VisionPortal camera",
    source: "hardware",
    integrationId: "visionportal",
    summary: "Official SDK VisionPortal camera stream.",
  });
  registerFrameProvider({
    id: "frame:limelight",
    displayName: "Limelight MJPEG stream",
    source: "network",
    integrationId: "limelight",
    summary: "Network vision coprocessor frames.",
  });
  registerFrameProvider({
    id: "frame:sim-virtual",
    displayName: "Sim virtual camera",
    source: "simulation",
    summary: "Virtual camera from FTC Sim runtime.",
  });
  registerFrameProvider({
    id: "frame:replay-file",
    displayName: "Replay file frames",
    source: "replay",
    summary: "Frames from an offline replay session.",
  });

  registerTelemetryProvider({
    id: "telemetry:logcat",
    displayName: "Robot Logcat",
    source: "logcat",
    summary: "Existing ftc logs stream.",
  });
  registerTelemetryProvider({
    id: "telemetry:ftc-dashboard",
    displayName: "FTC Dashboard",
    source: "dashboard",
    integrationId: "ftc-dashboard",
    summary: "Dashboard WebSocket telemetry when available.",
  });

  registerSimulationRuntime({
    id: "sim:adapter-placeholder",
    displayName: "Simulator adapter slot",
    summary: "Placeholder until sim adapters register runtimes.",
    exposesVirtualCameras: true,
  });

  registerReplayBackend({
    id: "replay:session-file",
    displayName: "Session file replay",
    kind: "file",
    summary: "Offline replay from recorded session files.",
  });

  registerVisionProvider({
    id: "vision:visionportal",
    displayName: "VisionPortal",
    kind: "visionportal",
    integrationId: "visionportal",
    frameProviderId: "frame:visionportal",
    summary: "Official SDK vision pipeline.",
  });
  registerVisionProvider({
    id: "vision:limelight",
    displayName: "Limelight",
    kind: "limelight",
    integrationId: "limelight",
    frameProviderId: "frame:limelight",
    summary: "Limelight pipeline and calibration.",
    experimental: true,
  });
  registerVisionProvider({
    id: "vision:sim-virtual",
    displayName: "Sim virtual camera",
    kind: "sim-virtual",
    integrationId: "visionportal",
    frameProviderId: "frame:sim-virtual",
    summary: "Vision over sim virtual camera via frame registry (no direct Sim import).",
    experimental: true,
  });
}

/** Reset bootstrap state (tests only). */
export function resetProviderCatalogForTests(): void {
  bootstrapped = false;
  clearFrameProviders();
  clearTelemetryProviders();
  clearSimulationRuntimes();
  clearReplayBackends();
  clearVisionProviders();
}

export function createProviderRegistrySnapshot(): ProviderRegistrySnapshot {
  bootstrapProviderCatalog();
  return {
    generatedAt: new Date().toISOString(),
    frameProviders: [...listFrameProviders()],
    telemetryProviders: [...listTelemetryProviders()],
    simulationRuntimes: [...listSimulationRuntimes()],
    replayBackends: [...listReplayBackends()],
    visionProviders: [...listVisionProviders()],
  };
}
