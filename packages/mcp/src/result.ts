import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Stable JSON tool payload for agents (never writes to stdout). */
export function jsonResult(data: unknown, isError = false): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

export function confirmationRequired(_action: string): CallToolResult {
  return jsonResult(
    {
      success: false,
      code: "CONFIRMATION_REQUIRED",
      message: `Refused: run dryRun=true to preview, then apply with confirmPlanId and confirmPlanHash from that response.`,
    },
    true,
  );
}
