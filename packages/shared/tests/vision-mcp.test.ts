import { describe, expect, it } from "vitest";
import { VISION_MCP_AGENT_TOOL_NAMES } from "../src/vision/mcp/constants.js";
import { findVisionMcpTool, getVisionMcpToolCatalog } from "../src/vision/mcp/catalog.js";
import {
  assertVisionMutationTarget,
  buildDeferredVisionMcpResult,
} from "../src/vision/mcp/deferred.js";
import { sanitizeVisionMcpPayload } from "../src/vision/mcp/sanitize.js";

describe("vision MCP foundation", () => {
  it("lists agent tool names from the catalog", () => {
    expect(VISION_MCP_AGENT_TOOL_NAMES).toHaveLength(15);
    const catalog = getVisionMcpToolCatalog();
    expect(
      catalog.every((entry) =>
        VISION_MCP_AGENT_TOOL_NAMES.includes(
          entry.name as (typeof VISION_MCP_AGENT_TOOL_NAMES)[number],
        ),
      ),
    ).toBe(true);
  });

  it("marks camera mutations as requiring endpoint identifiers", () => {
    const upload = findVisionMcpTool("vision_upload_pipeline");
    expect(upload?.requiresEndpoint).toBe(true);
    expect(upload?.requiresConfirmation).toBe(true);
    const denied = assertVisionMutationTarget({ tool: "vision_upload_pipeline" });
    expect(denied.ok).toBe(false);
    expect(
      assertVisionMutationTarget({
        tool: "vision_upload_pipeline",
        endpointId: "limelight-api:10.0.0.1:5807",
      }).ok,
    ).toBe(true);
  });

  it("builds deferred MCP results with legacy equivalents", () => {
    const result = buildDeferredVisionMcpResult("vision_list_sessions");
    expect(result.deferred).toBe(true);
    expect(result.equivalent).toBe("replay_status");
  });

  it("strips sensitive keys and truncates long strings", () => {
    const sanitized = sanitizeVisionMcpPayload(
      {
        password: "secret",
        note: "x".repeat(20_000),
      },
      { maxStringLength: 100 },
    ) as { password?: string; note: string };
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.note.length).toBeLessThan(200);
  });
});
