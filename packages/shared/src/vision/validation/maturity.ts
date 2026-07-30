import type { VisionFeatureMaturityEntry } from "./types.js";

/** Per-feature maturity for Vision Lab surfaces (VISION-17). None are hardware-validated until checklists pass. */
export const VISION_FEATURE_MATURITY: VisionFeatureMaturityEntry[] = [
  {
    featureId: "vision-workspace-discovery",
    label: "Vision workspace discovery",
    maturity: "Mock-tested",
    automatedTests: ["vision-discover.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-endpoint-discovery",
    label: "Vision endpoint discovery",
    providerId: "vision:limelight",
    maturity: "Mock-tested",
    automatedTests: ["vision-endpoints.test.ts", "vision-validation.test.ts"],
    notes: "Ambiguous multi-host selection covered in tests; never auto-selects.",
  },
  {
    featureId: "vision-limelight-http",
    label: "Limelight Vision HTTP status/results",
    providerId: "vision:limelight",
    maturity: "Mock-tested",
    automatedTests: ["limelight-provider.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-limelight-pipelines",
    label: "Limelight pipeline-as-code",
    providerId: "vision:limelight",
    maturity: "Mock-tested",
    automatedTests: ["limelight-pipelines.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-dashboard",
    label: "FTC Dashboard interoperability",
    providerId: "telemetry:ftc-dashboard",
    maturity: "Mock-tested",
    automatedTests: ["vision-validation.test.ts"],
  },
  {
    featureId: "vision-bridge",
    label: "Robot-side diagnostic bridge",
    providerId: "vision:visionportal",
    maturity: "Mock-tested",
    automatedTests: ["vision-bridge.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-portal-static",
    label: "VisionPortal static analysis",
    providerId: "vision:visionportal",
    maturity: "Mock-tested",
    automatedTests: ["vision-visionportal.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-easyopencv",
    label: "EasyOpenCV static analysis",
    providerId: "vision:easyopencv",
    maturity: "Mock-tested",
    automatedTests: ["vision-easyopencv.test.ts", "vision-validation.test.ts"],
  },
  {
    featureId: "vision-diagnostics",
    label: "Vision setup diagnostics",
    maturity: "Mock-tested",
    automatedTests: ["vision-diagnostics.test.ts"],
  },
  {
    featureId: "vision-inspector",
    label: "Vision result inspector",
    maturity: "Mock-tested",
    automatedTests: ["vision-inspector.test.ts"],
  },
  {
    featureId: "vision-codegen",
    label: "Vision Java codegen",
    maturity: "Mock-tested",
    automatedTests: ["vision-codegen.test.ts"],
    notes: "Generated Java compilation on robot hardware not validated in CI.",
  },
  {
    featureId: "vision-replay",
    label: "Session replay schema",
    providerId: "replay:session-file",
    maturity: "Mock-tested",
    automatedTests: ["replay-session.test.ts", "vision-validation.test.ts"],
    notes: "Live capture and offline replay deferred.",
  },
  {
    featureId: "vision-mcp-agent",
    label: "Agent-friendly vision MCP tools",
    maturity: "Mock-tested",
    automatedTests: ["mcp-vision-agent.test.ts", "vision-mcp.test.ts"],
  },
  {
    featureId: "vision-live-capture",
    label: "Live frame capture",
    maturity: "Deferred",
    automatedTests: [],
    notes: "Requires replay capture pipeline.",
  },
  {
    featureId: "vision-pipeline-upload",
    label: "Limelight pipeline upload/activate",
    providerId: "vision:limelight",
    maturity: "Deferred",
    automatedTests: [],
  },
];

export function getVisionFeatureMaturity(): VisionFeatureMaturityEntry[] {
  return VISION_FEATURE_MATURITY.map((entry) => ({
    ...entry,
    automatedTests: [...entry.automatedTests],
  }));
}

/** Returns true when no feature is incorrectly labeled beyond mock-tested without hardware evidence. */
export function assertMockTestedOnlyUnlessHardwareValidated(
  features: VisionFeatureMaturityEntry[],
  passedChecklistIds: ReadonlySet<string>,
): boolean {
  const hardwareLevels = new Set<VisionFeatureMaturityEntry["maturity"]>([
    "Android phone tested",
    "REV Control Hub tested",
    "Multi-team field tested",
    "Stable",
  ]);
  return features.every((feature) => {
    if (!hardwareLevels.has(feature.maturity)) {
      return true;
    }
    return passedChecklistIds.size > 0;
  });
}
