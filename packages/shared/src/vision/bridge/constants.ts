/** Payload schema version (vision-diagnostic.schema.json). */
export const VISION_DIAGNOSTIC_SCHEMA_VERSION = "1.0.0";

/** Generated Java bridge utility version — bump when templates change. */
export const VISION_BRIDGE_CODE_VERSION = "1.1.0";

/** Logcat prefix for structured diagnostic lines. */
export const VISION_DIAGNOSTIC_LOG_PREFIX = "FTC_VISION_DIAG:";

/** Default Java package suffix under TeamCode. */
export const VISION_BRIDGE_PACKAGE_SUFFIX = "vision";

export const VISION_BRIDGE_CLASS_NAMES = {
  utility: "FtcVisionDiagnosticBridge",
  opMode: "FtcVisionDiagnosticOpMode",
} as const;

/** Rate and size limits enforced by the bridge utility. */
export const VISION_BRIDGE_LIMITS = {
  maxPayloadBytes: 4096,
  minIntervalMs: 200,
  maxProcessors: 16,
  maxWarnings: 8,
} as const;

/** Preferred transport order when multiple are available. */
export const VISION_BRIDGE_TRANSPORT_PRIORITY = [
  "logcat",
  "ftc-dashboard",
  "robot-console",
] as const;

export type VisionBridgeTransport = (typeof VISION_BRIDGE_TRANSPORT_PRIORITY)[number];
