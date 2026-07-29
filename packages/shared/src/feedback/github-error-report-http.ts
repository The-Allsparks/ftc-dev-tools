import type { FetchLike } from "../sdk/types.js";

export interface GitHubIssueCreateResult {
  number: number;
  html_url: string;
}

export interface GitHubCommentCreateResult {
  html_url: string;
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "ftc-dev-tools-error-report",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function listOpenGitHubIssues(
  repoOwner: string,
  repoName: string,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<Array<{ number: number; title: string; state: string; html_url: string }>> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const repoBase = `https://api.github.com/repos/${repoOwner}/${repoName}`;
  const collected: Array<{ number: number; title: string; state: string; html_url: string }> = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = `${repoBase}/issues?state=open&per_page=100&page=${page}`;
    const response = await fetchImpl(url, { headers: githubHeaders(options.token) });
    if (!response.ok) {
      const body = await response.text();
      throw Object.assign(new Error(`GitHub issue list failed (${response.status})`), {
        code: "GITHUB_ERROR_REPORT_FAILED",
        status: response.status,
        body,
      });
    }
    const batch = (await response.json()) as Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      pull_request?: unknown;
    }>;
    for (const item of batch) {
      if (!item.pull_request) {
        collected.push(item);
      }
    }
    if (batch.length < 100) {
      break;
    }
  }

  return collected;
}

export async function createGitHubIssue(
  repoOwner: string,
  repoName: string,
  payload: { title: string; bodyMarkdown: string; labels: string[] },
  options: { token: string; fetchImpl?: FetchLike },
): Promise<GitHubIssueCreateResult> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { ...githubHeaders(options.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      body: payload.bodyMarkdown,
      labels: payload.labels,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`GitHub issue create failed (${response.status})`), {
      code: "GITHUB_ERROR_REPORT_FAILED",
      status: response.status,
      body,
    });
  }
  return (await response.json()) as GitHubIssueCreateResult;
}

export async function createGitHubIssueComment(
  repoOwner: string,
  repoName: string,
  issueNumber: number,
  bodyMarkdown: string,
  options: { token: string; fetchImpl?: FetchLike },
): Promise<GitHubCommentCreateResult> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { ...githubHeaders(options.token), "Content-Type": "application/json" },
    body: JSON.stringify({ body: bodyMarkdown }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`GitHub comment failed (${response.status})`), {
      code: "GITHUB_ERROR_REPORT_FAILED",
      status: response.status,
      body,
    });
  }
  return (await response.json()) as GitHubCommentCreateResult;
}
