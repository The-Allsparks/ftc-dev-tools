import type { ReplayCapabilities } from "./types.js";

export const REPLAY_CAPABILITIES: ReplayCapabilities = {
  sessionHeaderValidation: true,
  sessionEventValidation: true,
  sessionManifest: true,
  liveCapture: false,
  offlineReplay: false,
  frameCapture: false,
  annotatedFrameCapture: false,
  exportBundle: false,
  redaction: false,
  visionLabControls: false,
};
