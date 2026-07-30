import type { FetchLike } from "@ftc-dev-tools/shared";
import { redactSecrets, truncateText, type MaintainerContext, type RepoRef } from "./context.js";

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "ftc-maintainer-mcp",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubGet<T>(
  url: string,
  ctx: Pick<MaintainerContext, "token" | "fetchImpl">,
): Promise<T> {
  const response = await ctx.fetchImpl(url, { headers: headers(ctx.token) });
  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`GitHub API failed (${response.status}): ${url}`), {
      code: "GITHUB_API_FAILED",
      status: response.status,
      body: truncateText(redactSecrets(body), 2000),
    });
  }
  return (await response.json()) as T;
}

export interface GitHubIssueSummary {
  number: number;
  title: string;
  state: string;
  labels: string[];
  updatedAt: string;
  url: string;
  body?: string;
}

export interface GitHubPullSummary {
  number: number;
  title: string;
  state: string;
  mergedAt?: string;
  author: string;
  url: string;
  body: string;
  labels: string[];
  draft?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GitHubWorkflowRunSummary {
  id: number;
  name: string;
  conclusion: string | null;
  status: string;
  url: string;
  headBranch: string;
  event: string;
  createdAt: string;
}

export interface GitHubJobSummary {
  id: number;
  name: string;
  conclusion: string | null;
  status: string;
  steps: Array<{ name: string; conclusion: string | null; status: string }>;
}

function repoBase(repo: RepoRef): string {
  return `https://api.github.com/repos/${repo.owner}/${repo.name}`;
}

export async function listOpenIssues(
  ctx: MaintainerContext,
  options: { labels?: string[]; limit: number; includeBodies: boolean },
): Promise<{ totalOpen: number; issues: GitHubIssueSummary[] }> {
  const collected: GitHubIssueSummary[] = [];
  let totalOpen = 0;

  for (let page = 1; page <= 10; page += 1) {
    const params = new URLSearchParams({
      state: "open",
      per_page: "100",
      page: String(page),
      sort: "updated",
      direction: "desc",
    });
    for (const label of options.labels ?? []) {
      params.append("labels", label);
    }
    const batch = await githubGet<
      Array<{
        number: number;
        title: string;
        state: string;
        updated_at: string;
        html_url: string;
        body?: string;
        labels: Array<{ name: string }>;
        pull_request?: unknown;
      }>
    >(`${repoBase(ctx.repo)}/issues?${params}`, ctx);

    for (const item of batch) {
      if (item.pull_request) {
        continue;
      }
      totalOpen += 1;
      if (collected.length < options.limit) {
        collected.push({
          number: item.number,
          title: item.title,
          state: item.state,
          labels: item.labels.map((label) => label.name),
          updatedAt: item.updated_at,
          url: item.html_url,
          body: options.includeBodies
            ? truncateText(item.body ?? "", 1500)
            : undefined,
        });
      }
    }
    if (batch.length < 100) {
      break;
    }
  }

  return { totalOpen, issues: collected };
}

export async function searchMergedPullRequests(
  ctx: MaintainerContext,
  options: { since: Date; limit: number },
): Promise<GitHubPullSummary[]> {
  const since = options.since.toISOString().slice(0, 10);
  const q = encodeURIComponent(
    `repo:${ctx.repo.owner}/${ctx.repo.name} is:pr is:merged merged:>=${since}`,
  );
  const data = await githubGet<{
    items: Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      body?: string;
      user: { login: string };
      labels: Array<{ name: string }>;
      pull_request?: { merged_at?: string };
    }>;
  }>(`https://api.github.com/search/issues?q=${q}&sort=updated&order=desc&per_page=${Math.min(options.limit, 100)}`, ctx);

  const results: GitHubPullSummary[] = [];
  for (const item of data.items.slice(0, options.limit)) {
    const pr = await githubGet<{
      merged_at: string | null;
      body: string;
      user: { login: string };
    }>(`${repoBase(ctx.repo)}/pulls/${item.number}`, ctx);
    results.push({
      number: item.number,
      title: item.title,
      state: item.state,
      mergedAt: pr.merged_at ?? undefined,
      author: pr.user.login,
      url: item.html_url,
      body: pr.body ?? "",
      labels: item.labels.map((label) => label.name),
    });
  }
  return results;
}

export async function listOpenPullRequests(
  ctx: MaintainerContext,
  options: { limit: number },
): Promise<GitHubPullSummary[]> {
  const batch = await githubGet<
    Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      body: string;
      user: { login: string };
      labels: Array<{ name: string }>;
      draft?: boolean;
      created_at?: string;
      updated_at?: string;
    }>
  >(
    `${repoBase(ctx.repo)}/pulls?state=open&sort=updated&direction=desc&per_page=${Math.min(options.limit, 100)}`,
    ctx,
  );
  return batch.slice(0, options.limit).map((item) => ({
    number: item.number,
    title: item.title,
    state: item.state,
    author: item.user.login,
    url: item.html_url,
    body: item.body ?? "",
    labels: item.labels.map((label) => label.name),
    draft: item.draft,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

export async function searchIssues(
  ctx: MaintainerContext,
  options: { query: string; state?: "open" | "closed" | "all"; limit: number },
): Promise<GitHubIssueSummary[]> {
  const statePart =
    options.state && options.state !== "all" ? ` is:issue is:${options.state}` : " is:issue";
  const q = encodeURIComponent(
    `repo:${ctx.repo.owner}/${ctx.repo.name}${statePart} ${options.query}`.trim(),
  );
  const data = await githubGet<{
    items: Array<{
      number: number;
      title: string;
      state: string;
      updated_at: string;
      html_url: string;
      body?: string;
      labels: Array<{ name: string }>;
      pull_request?: unknown;
    }>;
  }>(
    `https://api.github.com/search/issues?q=${q}&sort=updated&order=desc&per_page=${Math.min(options.limit, 100)}`,
    ctx,
  );
  return data.items
    .filter((item) => !item.pull_request)
    .slice(0, options.limit)
    .map((item) => ({
      number: item.number,
      title: item.title,
      state: item.state,
      labels: item.labels.map((label) => label.name),
      updatedAt: item.updated_at,
      url: item.html_url,
    }));
}

export async function fetchLabelCatalogFromGitHub(ctx: MaintainerContext): Promise<{
  issues: Record<string, string[]>;
}> {
  const data = await githubGet<{ content: string; encoding: string }>(
    `${repoBase(ctx.repo)}/contents/scripts/issue-label-catalog.json`,
    ctx,
  );
  if (data.encoding !== "base64") {
    throw Object.assign(new Error("Unexpected catalog encoding from GitHub."), {
      code: "CATALOG_UNAVAILABLE",
    });
  }
  const text = Buffer.from(data.content, "base64").toString("utf8");
  return JSON.parse(text) as { issues: Record<string, string[]> };
}

export async function getLatestRelease(ctx: MaintainerContext): Promise<{
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
}> {
  const release = await githubGet<{
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
  }>(`${repoBase(ctx.repo)}/releases/latest`, ctx);
  return {
    tag: release.tag_name,
    name: release.name,
    publishedAt: release.published_at,
    url: release.html_url,
  };
}

export async function compareRefs(
  ctx: MaintainerContext,
  baseRef: string,
  headRef: string,
): Promise<{
  aheadBy: number;
  commits: Array<{ sha: string; message: string; author: string }>;
}> {
  const data = await githubGet<{
    ahead_by: number;
    commits: Array<{ sha: string; commit: { message: string; author: { name: string } } }>;
  }>(`${repoBase(ctx.repo)}/compare/${baseRef}...${headRef}`, ctx);
  return {
    aheadBy: data.ahead_by,
    commits: data.commits.slice(0, 50).map((commit) => ({
      sha: commit.sha.slice(0, 7),
      message: commit.commit.message.split("\n")[0],
      author: commit.commit.author.name,
    })),
  };
}

export async function createIssue(
  ctx: MaintainerContext,
  payload: { title: string; body: string; labels: string[] },
): Promise<{ number: number; url: string }> {
  const response = await ctx.fetchImpl(`${repoBase(ctx.repo)}/issues`, {
    method: "POST",
    headers: { ...headers(ctx.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
    }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw Object.assign(new Error(`GitHub issue create failed (${response.status})`), {
      code: "GITHUB_API_FAILED",
      status: response.status,
      body: truncateText(redactSecrets(errBody), 2000),
    });
  }
  const issue = (await response.json()) as { number: number; html_url: string };
  return { number: issue.number, url: issue.html_url };
}

export async function getIssue(
  ctx: MaintainerContext,
  issueNumber: number,
): Promise<{ number: number; title: string; state: string; body: string; labels: string[]; url: string }> {
  const issue = await githubGet<{
    number: number;
    title: string;
    state: string;
    body: string;
    html_url: string;
    labels: Array<{ name: string }>;
    pull_request?: unknown;
  }>(`${repoBase(ctx.repo)}/issues/${issueNumber}`, ctx);
  if (issue.pull_request) {
    throw Object.assign(new Error(`#${issueNumber} is a pull request, not an issue.`), {
      code: "NOT_AN_ISSUE",
    });
  }
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    body: issue.body ?? "",
    labels: issue.labels.map((label) => label.name),
    url: issue.html_url,
  };
}

export async function getWorkflowRun(
  ctx: MaintainerContext,
  runId: number,
): Promise<GitHubWorkflowRunSummary> {
  const run = await githubGet<{
    id: number;
    name: string;
    conclusion: string | null;
    status: string;
    html_url: string;
    head_branch: string;
    event: string;
    created_at: string;
  }>(`${repoBase(ctx.repo)}/actions/runs/${runId}`, ctx);
  return {
    id: run.id,
    name: run.name,
    conclusion: run.conclusion,
    status: run.status,
    url: run.html_url,
    headBranch: run.head_branch,
    event: run.event,
    createdAt: run.created_at,
  };
}

export async function listWorkflowRuns(
  ctx: MaintainerContext,
  options: { branch?: string; event?: string; limit: number },
): Promise<GitHubWorkflowRunSummary[]> {
  const params = new URLSearchParams({ per_page: String(Math.min(options.limit, 30)) });
  if (options.branch) {
    params.set("branch", options.branch);
  }
  if (options.event) {
    params.set("event", options.event);
  }
  const data = await githubGet<{
    workflow_runs: Array<{
      id: number;
      name: string;
      conclusion: string | null;
      status: string;
      html_url: string;
      head_branch: string;
      event: string;
      created_at: string;
    }>;
  }>(`${repoBase(ctx.repo)}/actions/runs?${params}`, ctx);
  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    conclusion: run.conclusion,
    status: run.status,
    url: run.html_url,
    headBranch: run.head_branch,
    event: run.event,
    createdAt: run.created_at,
  }));
}

export async function listJobsForRun(
  ctx: MaintainerContext,
  runId: number,
): Promise<GitHubJobSummary[]> {
  const data = await githubGet<{
    jobs: Array<{
      id: number;
      name: string;
      conclusion: string | null;
      status: string;
      steps: Array<{ name: string; conclusion: string | null; status: string }>;
    }>;
  }>(`${repoBase(ctx.repo)}/actions/runs/${runId}/jobs`, ctx);
  return data.jobs.map((job) => ({
    id: job.id,
    name: job.name,
    conclusion: job.conclusion,
    status: job.status,
    steps: job.steps ?? [],
  }));
}

export async function downloadJobLogExcerpt(
  ctx: MaintainerContext,
  jobId: number,
  maxChars: number,
): Promise<string> {
  const url = `${repoBase(ctx.repo)}/actions/jobs/${jobId}/logs`;
  const response = await fetch(url, {
    headers: headers(ctx.token),
    redirect: "follow",
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw Object.assign(new Error(`GitHub job log failed (${response.status})`), {
      code: "GITHUB_API_FAILED",
      status: response.status,
      body: truncateText(redactSecrets(errBody), 2000),
    });
  }
  return truncateText(redactSecrets(await response.text()), maxChars);
}

export async function findLatestFailedRunForPr(
  ctx: MaintainerContext,
  prNumber: number,
): Promise<GitHubWorkflowRunSummary | undefined> {
  const pr = await githubGet<{ head: { ref: string } }>(`${repoBase(ctx.repo)}/pulls/${prNumber}`, ctx);
  const runs = await listWorkflowRuns(ctx, { branch: pr.head.ref, limit: 20 });
  return runs.find((run) => run.conclusion === "failure");
}

export async function createIssueComment(
  ctx: MaintainerContext,
  issueNumber: number,
  body: string,
): Promise<{ commentUrl: string }> {
  const response = await ctx.fetchImpl(`${repoBase(ctx.repo)}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: { ...headers(ctx.token), "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw Object.assign(new Error(`GitHub comment failed (${response.status})`), {
      code: "GITHUB_API_FAILED",
      status: response.status,
      body: truncateText(redactSecrets(errBody), 2000),
    });
  }
  const comment = (await response.json()) as { html_url: string };
  return { commentUrl: comment.html_url };
}

/** Test helper */
export function createMockContext(
  repo: RepoRef,
  fetchImpl: FetchLike,
  token = "test-token",
): MaintainerContext {
  return { repo, token, fetchImpl };
}
