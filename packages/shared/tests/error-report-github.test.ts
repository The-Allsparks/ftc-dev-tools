import { describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import {
  buildErrorOccurrenceComment,
  buildErrorReportIssueTitle,
  buildInitialErrorReportBody,
  findOpenErrorReportIssueByTitle,
  submitErrorReport,
} from "../src/feedback/error-report-github.js";
import type { ErrorReportInput } from "../src/feedback/error-report-types.js";

const sampleInput: ErrorReportInput = {
  commandAttempted: "ftc.build",
  reporterLogin: "student1",
  occurredAt: "2026-07-29T12:00:00.000Z",
  error: {
    code: "GRADLE_FAILED",
    title: "Build failed",
    summary: "Gradle exited with code 1.",
    suggestedActions: ["Open the Build output", "Run doctor"],
    technicalDetails: "password=secret123\nFAILURE: Build failed",
  },
  environment: {
    productVersion: "0.1.0",
    surface: "vscode",
    platform: "win32",
    osRelease: "10.0",
    nodeVersion: "v22.0.0",
  },
  deploySteps: ["Validated project", "Running Gradle"],
};

function mockFetchSequence(
  handlers: Array<(url: string, init?: { method?: string; body?: string }) => unknown>,
): FetchLike {
  let call = 0;
  return async (url, init) => {
    const handler = handlers[call];
    call += 1;
    if (!handler) {
      throw new Error(`Unexpected fetch #${call}: ${url}`);
    }
    const result = handler(url, init);
    if (result && typeof result === "object" && "ok" in result) {
      return result as Awaited<ReturnType<FetchLike>>;
    }
    return result as Awaited<ReturnType<FetchLike>>;
  };
}

function jsonResponse(json: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    async json() {
      return json;
    },
    async text() {
      return JSON.stringify(json);
    },
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
  };
}

describe("error-report-github", () => {
  it("builds stable issue titles", () => {
    expect(buildErrorReportIssueTitle("ftc.build", "0.1.0")).toBe("[error] ftc.build 0.1.0");
  });

  it("redacts secrets in initial body", () => {
    const body = buildInitialErrorReportBody(sampleInput);
    expect(body).toContain("GRADLE_FAILED");
    expect(body).not.toContain("secret123");
    expect(body).toContain("***");
  });

  it("builds occurrence comments", () => {
    const comment = buildErrorOccurrenceComment(sampleInput);
    expect(comment).toContain("Occurrence report");
    expect(comment).toContain("GRADLE_FAILED");
  });

  it("finds open issue by exact title", async () => {
    const title = buildErrorReportIssueTitle("ftc.deploy", "0.1.0");
    const fetchImpl = mockFetchSequence([
      () =>
        jsonResponse({
          items: [
            { number: 99, title, state: "open", html_url: "https://github.com/o/r/issues/99" },
            {
              number: 1,
              title: "other",
              state: "open",
              html_url: "https://github.com/o/r/issues/1",
            },
          ],
        }),
    ]);
    const found = await findOpenErrorReportIssueByTitle(title, {
      token: "test-token",
      fetchImpl,
    });
    expect(found?.number).toBe(99);
  });

  it("creates issue when none exists", async () => {
    const fetchImpl = mockFetchSequence([
      () => jsonResponse({ items: [] }),
      () =>
        jsonResponse({
          number: 131,
          html_url: "https://github.com/The-Allsparks/ftc-dev-tools/issues/131",
        }),
    ]);
    const result = await submitErrorReport(sampleInput, {
      token: "test-token",
      fetchImpl,
    });
    expect(result.action).toBe("created");
    expect(result.issueNumber).toBe(131);
  });

  it("comments when open issue exists", async () => {
    const title = buildErrorReportIssueTitle(sampleInput.commandAttempted, "0.1.0");
    const fetchImpl = mockFetchSequence([
      () =>
        jsonResponse({
          items: [
            { number: 50, title, state: "open", html_url: "https://github.com/o/r/issues/50" },
          ],
        }),
      () =>
        jsonResponse({
          html_url: "https://github.com/o/r/issues/50#issuecomment-1",
        }),
    ]);
    const result = await submitErrorReport(sampleInput, {
      token: "test-token",
      fetchImpl,
    });
    expect(result.action).toBe("commented");
    expect(result.issueNumber).toBe(50);
    expect(result.commentUrl).toContain("comment");
  });
});

describe("github-report-token", () => {
  it("round-trips encrypted token storage", async () => {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const { storeGitHubReportToken, loadGitHubReportToken, clearGitHubReportToken } =
      await import("../src/feedback/github-report-token.js");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-gh-token-"));
    const tokenPath = path.join(dir, "github-report-token.enc");
    await storeGitHubReportToken("ghp_testtoken123", { tokenPath });
    await expect(loadGitHubReportToken({ tokenPath })).resolves.toBe("ghp_testtoken123");
    await clearGitHubReportToken({ tokenPath });
    await expect(loadGitHubReportToken({ tokenPath })).resolves.toBeUndefined();
  });
});
