import { PACKAGE_VERSION } from "@ftc-dev-tools/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  toolCiFailureSummary,
  toolIssueComment,
  toolIssueCreatePreview,
  toolIssueLabelCheck,
  toolIssuePrAlignment,
  toolIssueShow,
  toolIssuesOpenSummary,
  toolIssuesSearch,
  toolOpenPrsSummary,
  toolPrsMergedSince,
  toolReleaseDiff,
} from "./tools.js";

export const MAINTAINER_MCP_TOOL_NAMES = [
  "issues_open_summary",
  "issues_search",
  "issue_show",
  "issue_label_check",
  "prs_merged_since",
  "open_prs_summary",
  "issue_pr_alignment",
  "ci_failure_summary",
  "issue_comment",
  "issue_create_preview",
  "release_diff",
] as const;

export type MaintainerMcpToolName = (typeof MAINTAINER_MCP_TOOL_NAMES)[number];

export function createMaintainerMcpServer(): McpServer {
  const server = new McpServer({
    name: "ftc-maintainer-mcp",
    version: PACKAGE_VERSION,
  });

  server.registerTool(
    "issues_open_summary",
    {
      title: "Open issues summary",
      description: "Summarize open GitHub issues for maintainer triage (bounded JSON).",
      inputSchema: z.object({
        labels: z.array(z.string()).optional().describe("Filter by labels (AND)"),
        limit: z.number().int().optional().describe("Max issues returned (default 30, max 100)"),
        groupBy: z.enum(["priority", "label", "none"]).optional(),
        includeBodies: z.boolean().optional().describe("Include truncated issue bodies"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolIssuesOpenSummary(args),
  );

  server.registerTool(
    "issues_search",
    {
      title: "Search issues",
      description: "Search repo issues by free-text query (e.g. VISION, Orchestrator, epic).",
      inputSchema: z.object({
        query: z.string().describe("GitHub search query terms (repo scope applied automatically)"),
        state: z.enum(["open", "closed", "all"]).optional(),
        limit: z.number().int().optional().describe("Max results (default 20, max 50)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolIssuesSearch(args),
  );

  server.registerTool(
    "issue_show",
    {
      title: "Show issue",
      description: "Bounded single-issue view with parsed acceptance criteria checklist.",
      inputSchema: z.object({
        issueNumber: z.number().int(),
        maxBodyChars: z.number().int().optional().describe("Max body chars (default 4000)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolIssueShow(args),
  );

  server.registerTool(
    "issue_label_check",
    {
      title: "Issue label check",
      description:
        "Validate issue labels against scripts/issue-label-catalog.json (local MAINTAINER_REPO_ROOT or GitHub).",
      inputSchema: z.object({
        issueNumbers: z.array(z.number().int()).optional(),
        limit: z.number().int().optional().describe("Max open issues when issueNumbers omitted"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolIssueLabelCheck(args),
  );

  server.registerTool(
    "prs_merged_since",
    {
      title: "Merged PRs since",
      description: "List merged pull requests in a time window with parsed closing issue refs.",
      inputSchema: z.object({
        since: z
          .string()
          .optional()
          .describe("ISO date or relative window like 14d (default 14d)"),
        limit: z.number().int().optional().describe("Max PRs (default 20, max 50)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolPrsMergedSince(args),
  );

  server.registerTool(
    "open_prs_summary",
    {
      title: "Open PRs summary",
      description: "Summarize open pull requests (draft state, labels, closing issue refs).",
      inputSchema: z.object({
        limit: z.number().int().optional().describe("Max PRs (default 20, max 50)"),
        author: z.string().optional().describe("Filter by GitHub login"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolOpenPrsSummary(args),
  );

  server.registerTool(
    "issue_pr_alignment",
    {
      title: "Issue PR alignment",
      description:
        "Cross-reference open issues with recent merged/open PRs; matches Fixes #, #N, and codenames like VISION-06.",
      inputSchema: z.object({
        issueNumbers: z.array(z.number().int()).optional().describe("Issues to analyze"),
        limit: z.number().int().optional().describe("Max issues when issueNumbers omitted"),
        prWindow: z.string().optional().describe("Merged PR window like 30d (default 30d)"),
        includeOpenPrs: z.boolean().optional().describe("Include open PRs (default true)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolIssuePrAlignment(args),
  );

  server.registerTool(
    "ci_failure_summary",
    {
      title: "CI failure summary",
      description: "Summarize a failed GitHub Actions run with bounded log excerpts.",
      inputSchema: z.object({
        runId: z.number().int().optional(),
        prNumber: z.number().int().optional(),
        branch: z.string().optional(),
        workflow: z.string().optional().describe("Filter by workflow name substring"),
        maxLogChars: z.number().int().optional().describe("Max log chars per job (default 4096)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolCiFailureSummary(args),
  );

  server.registerTool(
    "issue_comment",
    {
      title: "Issue comment",
      description:
        "Preview or post a GitHub issue comment. Requires yes=true to post. template=alignment builds an alignment comment.",
      inputSchema: z.object({
        issueNumber: z.number().int(),
        body: z.string().optional(),
        yes: z.boolean().optional().describe("Must be true to post (otherwise preview only)"),
        template: z.enum(["alignment", "none"]).optional(),
        prWindow: z.string().optional().describe("PR window for alignment template"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolIssueComment(args),
  );

  server.registerTool(
    "issue_create_preview",
    {
      title: "Issue create preview",
      description:
        "Preview a new issue with catalog-suggested labels. Requires yes=true to create on GitHub.",
      inputSchema: z.object({
        title: z.string().describe("Exact issue title (matches issue-label-catalog.json when possible)"),
        body: z.string().optional(),
        labels: z.array(z.string()).optional().describe("Override catalog labels"),
        yes: z.boolean().optional().describe("Must be true to create the issue"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolIssueCreatePreview(args),
  );

  server.registerTool(
    "release_diff",
    {
      title: "Release diff",
      description: "Compare latest release tag (or baseTag) to main for release-notes prep.",
      inputSchema: z.object({
        baseTag: z.string().optional().describe("Release tag to compare from (default: latest release)"),
        compareBranch: z.string().optional().describe("Head branch (default main)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolReleaseDiff(args),
  );

  return server;
}
