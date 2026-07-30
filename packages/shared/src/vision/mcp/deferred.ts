import { findVisionMcpTool } from "./catalog.js";
import type { VisionMcpDeferredResult } from "./types.js";

export function buildDeferredVisionMcpResult(tool: string): VisionMcpDeferredResult {
  const entry = findVisionMcpTool(tool);
  return {
    tool,
    deferred: true,
    message: entry?.deferredReason ?? "This vision MCP tool is cataloged but not implemented yet.",
    equivalent: entry?.legacyEquivalent,
    requiredFields: entry?.requiresEndpoint ? ["endpointId"] : undefined,
  };
}

export function assertVisionMutationTarget(args: {
  endpointId?: string;
  host?: string;
  tool: string;
}): { ok: true } | { ok: false; message: string; code: string } {
  const entry = findVisionMcpTool(args.tool);
  if (!entry?.requiresEndpoint) {
    return { ok: true };
  }
  if (args.endpointId?.trim() || args.host?.trim()) {
    return { ok: true };
  }
  return {
    ok: false,
    code: "VISION_SELECTION_REQUIRED",
    message:
      "Mutating vision tools require an explicit endpointId (from vision_list_devices) or host — never auto-select among cameras.",
  };
}
