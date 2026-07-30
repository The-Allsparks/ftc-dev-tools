import type { VisionDiagnosticsCapabilities } from "./types.js";

/** Deferred VISION-14 capabilities — foundation PR only aggregates existing signals. */
export const VISION_DIAGNOSTICS_CAPABILITIES: VisionDiagnosticsCapabilities = {
  liveImageHeuristics: false,
  logcatBridgeParsing: false,
  bundleExport: false,
  visionLabPanelIntegration: false,
};
