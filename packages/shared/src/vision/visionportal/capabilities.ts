import type { VisionPortalCapabilities } from "./types.js";

/** Desktop-side VisionPortal capabilities (VISION-08 foundation). Runtime controls deferred. */
export const VISION_PORTAL_CAPABILITIES: VisionPortalCapabilities = {
  staticAnalysis: true,
  bridgeProcessorState: true,
  aprilTagResults: true,
  colorResults: true,
  customProcessorAdapters: true,
  cameraControls: false,
  streamingActions: false,
  processorToggle: false,
  multiCameraSwitch: false,
};
