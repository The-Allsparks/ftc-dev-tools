import { describe, expect, it } from "vitest";
import { validateIssueLabels } from "../src/label-catalog.js";
import {
  extractIssueCodename,
  inferAlignment,
  parseAcceptanceCriteria,
  parseClosingIssueRefs,
  relationForIssue,
  tailLogLines,
} from "../src/parse.js";
import { toolIssueComment } from "../src/tools.js";

describe("maintainer parse helpers", () => {
  it("parses closing issue refs from PR bodies", () => {
    expect(parseClosingIssueRefs("Fixes #165 and closes #166")).toEqual([165, 166]);
    expect(parseClosingIssueRefs("No refs here")).toEqual([]);
  });

  it("extracts issue codenames from titles", () => {
    expect(extractIssueCodename("VISION-06: FTC Dashboard interoperability")).toBe("VISION-06");
    expect(extractIssueCodename("Regular issue title")).toBeUndefined();
  });

  it("classifies PR relation to an issue", () => {
    const pr = {
      title: "Vision MCP",
      body: "Fixes #64",
      closingIssues: [64],
    };
    expect(relationForIssue(64, "VISION-16: Add FTC Vision MCP tools", pr)).toBe("closes");
    expect(relationForIssue(65, "Other issue", pr)).toBe("none");
  });

  it("matches codename in PR title without Fixes #", () => {
    const pr = {
      title: "VISION-06: FTC Dashboard interoperability",
      body: "",
      closingIssues: [],
    };
    expect(relationForIssue(54, "VISION-06: Something on issue", pr)).toBe("mentions");
  });

  it("matches hash-prefixed issue titles", () => {
    const pr = {
      title: "#41 Guided Connect My Robot flow (USB first)",
      body: "",
      closingIssues: [],
    };
    expect(relationForIssue(41, "#41 Guided Connect My Robot flow (USB first)", pr)).toBe("mentions");
  });

  it("infers alignment from linked PRs", () => {
    expect(
      inferAlignment({
        linkedPrs: [{ state: "merged", relation: "closes" }],
      }),
    ).toBe("likely_closed");
    expect(
      inferAlignment({
        linkedPrs: [{ state: "merged", relation: "mentions" }],
      }),
    ).toBe("partial");
    expect(inferAlignment({ linkedPrs: [] })).toBe("unaddressed");
  });

  it("parses acceptance criteria checklist", () => {
    const body = `## Acceptance criteria\n\n- [x] Done item\n- [ ] Todo item\n`;
    expect(parseAcceptanceCriteria(body)).toEqual([
      { checked: true, text: "Done item" },
      { checked: false, text: "Todo item" },
    ]);
  });

  it("tails log lines", () => {
    const log = Array.from({ length: 100 }, (_, i) => `line-${i}`).join("\n");
    const tailed = tailLogLines(log, 5);
    expect(tailed.split("\n")).toHaveLength(5);
    expect(tailed).toContain("line-99");
  });
});

describe("label catalog validation", () => {
  it("flags missing catalog labels", () => {
    const result = validateIssueLabels({
      title: "Add optional maintainer MCP package for GitHub issue, PR, and CI triage",
      state: "open",
      labels: ["enhancement"],
      catalog: {
        issues: {
          "Add optional maintainer MCP package for GitHub issue, PR, and CI triage": [
            "enhancement",
            "mcp",
            "priority: P2",
          ],
        },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain("catalog missing labels");
  });
});

describe("issue_comment gate", () => {
  it("returns preview when yes is not true", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/issues/1/comments")) {
        throw new Error("should not post without yes=true");
      }
      if (url.includes("/issues/1")) {
        return new Response(
          JSON.stringify({
            number: 1,
            title: "Test issue",
            state: "open",
            body: "- [ ] remaining task",
            html_url: "https://example.com/issues/1",
            labels: [],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/search/issues")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (url.includes("/pulls?")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO = "The-Allsparks/ftc-dev-tools";

    try {
      const result = await toolIssueComment({
        issueNumber: 1,
        body: "Preview only",
      });
      expect(result.isError).not.toBe(true);
      const text = result.content.find((item) => item.type === "text")?.text ?? "{}";
      const payload = JSON.parse(text) as { preview?: boolean };
      expect(payload.preview).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPO;
    }
  });
});

describe("maintainer MCP server catalog", () => {
  it("exports eleven tool names", async () => {
    const { MAINTAINER_MCP_TOOL_NAMES, createMaintainerMcpServer } = await import("../src/server.js");
    expect(MAINTAINER_MCP_TOOL_NAMES).toHaveLength(11);
    expect(MAINTAINER_MCP_TOOL_NAMES).toContain("open_prs_summary");
    expect(MAINTAINER_MCP_TOOL_NAMES).toContain("issue_label_check");
    expect(() => createMaintainerMcpServer()).not.toThrow();
  });
});
