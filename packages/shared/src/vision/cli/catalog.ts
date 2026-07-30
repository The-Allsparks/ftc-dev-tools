import type { VisionCliCatalogEntry } from "./types.js";

/** Canonical vision CLI surface for docs, completion metadata, and deferred stubs (VISION-15). */
export const VISION_CLI_CATALOG: VisionCliCatalogEntry[] = [
  {
    command: "ftc vision status",
    summary: "Vision config and workspace signals",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision discover",
    summary: "Scan TeamCode and Gradle for vision libraries",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision devices",
    summary: "Discover and probe vision endpoints",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision diagnostics",
    summary: "Aggregate setup diagnostics",
    available: true,
    mutating: false,
    equivalent: "ftc vision diagnose",
  },
  {
    command: "ftc vision diagnose",
    summary: "Alias for vision diagnostics",
    available: true,
    mutating: false,
    equivalent: "ftc vision diagnostics",
  },
  {
    command: "ftc vision open",
    summary: "Open Limelight web UI or FTC Dashboard in a browser",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision capture",
    summary: "Capture a still frame from a vision provider",
    available: false,
    mutating: false,
    deferredReason: "Live frame capture deferred until replay capture ships (VISION-13+).",
  },
  {
    command: "ftc vision pipelines list",
    summary: "List Limelight pipeline artifacts",
    available: true,
    mutating: false,
    equivalent: "ftc vision limelight pipelines list",
  },
  {
    command: "ftc vision pipelines validate",
    summary: "Validate pipeline JSON in workspace",
    available: true,
    mutating: false,
    equivalent: "ftc vision limelight pipelines validate",
  },
  {
    command: "ftc vision pipelines compare",
    summary: "Compare workspace pipeline with camera slot",
    available: true,
    mutating: false,
    equivalent: "ftc vision limelight pipelines diff",
  },
  {
    command: "ftc vision pipelines pull",
    summary: "Download pipeline from camera to workspace",
    available: false,
    mutating: true,
    deferredReason: "Limelight pull deferred — read-only diff/validate foundation (VISION-05+).",
  },
  {
    command: "ftc vision pipelines push",
    summary: "Upload workspace pipeline to camera",
    available: false,
    mutating: true,
    deferredReason: "Limelight upload deferred (VISION-05+).",
  },
  {
    command: "ftc vision pipelines activate",
    summary: "Switch active pipeline slot on camera",
    available: false,
    mutating: true,
    deferredReason: "Limelight activate deferred (VISION-05+).",
  },
  {
    command: "ftc vision pipelines reload",
    summary: "Reload pipeline on camera without reboot",
    available: false,
    mutating: true,
    deferredReason: "Limelight reload deferred (VISION-05+).",
  },
  {
    command: "ftc vision sessions list",
    summary: "List recorded vision sessions",
    available: false,
    mutating: false,
    deferredReason: "Session capture deferred — schema validation only (VISION-13).",
    equivalent: "ftc replay status",
  },
  {
    command: "ftc vision sessions record",
    summary: "Start live session recording",
    available: false,
    mutating: true,
    deferredReason: "Live capture deferred (FTC Replay epic).",
  },
  {
    command: "ftc vision sessions inspect",
    summary: "Inspect a recorded session",
    available: false,
    mutating: false,
    deferredReason: "Offline replay deferred (VISION-13+).",
  },
  {
    command: "ftc vision sessions replay",
    summary: "Replay a recorded session",
    available: false,
    mutating: false,
    deferredReason: "Offline replay deferred (VISION-13+).",
  },
  {
    command: "ftc vision sessions export",
    summary: "Export session bundle",
    available: false,
    mutating: false,
    deferredReason: "Export bundle deferred (VISION-13+).",
  },
  {
    command: "ftc vision codegen list",
    summary: "List Java codegen templates",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision codegen scaffold <kind>",
    summary: "Generate Java vision OpMode stubs",
    available: true,
    mutating: true,
  },
  {
    command: "ftc vision codegen limelight",
    summary: "Shortcut for limelight codegen scaffold",
    available: true,
    mutating: true,
  },
  {
    command: "ftc vision codegen easyopencv",
    summary: "Shortcut for EasyOpenCV codegen scaffold",
    available: true,
    mutating: true,
  },
  {
    command: "ftc vision codegen visionportal",
    summary: "Shortcut for VisionPortal AprilTag codegen",
    available: true,
    mutating: true,
  },
  {
    command: "ftc vision codegen diagnostic-opmode",
    summary: "Shortcut for diagnostic bridge scaffold",
    available: true,
    mutating: true,
    equivalent: "ftc vision bridge scaffold",
  },
  {
    command: "ftc vision limelight status",
    summary: "Limelight HTTP device status",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision limelight results",
    summary: "Limelight targeting results",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision dashboard status",
    summary: "FTC Dashboard dependency and reachability",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision dashboard open",
    summary: "Open FTC Dashboard (also available via ftc vision open)",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision bridge status",
    summary: "Robot-side diagnostic bridge status",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision bridge scaffold",
    summary: "Scaffold optional diagnostic bridge Java files",
    available: true,
    mutating: true,
  },
  {
    command: "ftc vision visionportal status",
    summary: "VisionPortal static analysis",
    available: true,
    mutating: false,
  },
  {
    command: "ftc vision easyopencv status",
    summary: "EasyOpenCV static analysis",
    available: true,
    mutating: false,
  },
];

export function getVisionCliCatalog(): VisionCliCatalogEntry[] {
  return VISION_CLI_CATALOG.map((entry) => ({ ...entry }));
}

export function findVisionCliCatalogEntry(command: string): VisionCliCatalogEntry | undefined {
  const normalized = command.trim().replace(/\s+/g, " ");
  return VISION_CLI_CATALOG.find((entry) => entry.command === normalized);
}
