import type { VisionInspectorCapabilities } from "./types.js";

export const VISION_INSPECTOR_CAPABILITIES: VisionInspectorCapabilities = {
  structuredResults: true,
  overlayPreview: true,
  liveVideoOverlay: false,
  metricsGraphs: false,
  copyAsJson: true,
  exportResult: false,
  configurableThresholds: false,
};
