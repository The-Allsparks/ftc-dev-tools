#!/usr/bin/env node
/**
 * FTC Dev Tools maintainer MCP server (stdio).
 * Do not write application logs to stdout — it is reserved for MCP JSON-RPC.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMaintainerMcpServer } from "./server.js";

async function main(): Promise<void> {
  const server = createMaintainerMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
