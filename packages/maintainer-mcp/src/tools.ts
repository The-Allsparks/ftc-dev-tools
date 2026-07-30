import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  clampLimit,
  createMaintainerContext,
  parseSinceDays,
  truncateText,
  type MaintainerContext,
} from "./context.js";
import {
  createIssueComment,
  createIssue,
  compareRefs,
  downloadJobLogExcerpt,
  fetchLabelCatalogFromGitHub,
  findLatestFailedRunForPr,
  getIssue,
  getLatestRelease,
  listJobsForRun,
  listOpenIssues,
  listOpenPullRequests,
  listWorkflowRuns,
  getWorkflowRun,
  searchIssues,
  searchMergedPullRequests,
} from "./github-api.js";
import {
  catalogLabelsForTitle,
  loadLabelCatalog,
  resolveCatalogPath,
  validateIssueLabels,
} from "./label-catalog.js";
import {
  extractRemainingWork,
  inferAlignment,
  parseAcceptanceCriteria,
  parseClosingIssueRefs,
  relationForIssue,
  tailLogLines,
} from "./parse.js";
import { jsonResult } from "./result.js";

async function loadCatalog(ctx: MaintainerContext) {
  return loadLabelCatalog({
    localPath: resolveCatalogPath(),
    fetchFromGitHub: () => fetchLabelCatalogFromGitHub(ctx),
  });
}

async function withContext(
  run: (ctx: MaintainerContext) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    const ctx = await createMaintainerContext();
    return await run(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "MAINTAINER_MCP_ERROR";
    return jsonResult({ success: false, code, message }, true);
  }
}

function groupIssues<T extends { labels: string[] }>(
  issues: T[],
  groupBy: "priority" | "label" | "none",
): Array<{ key: string; count: number; issues: T[] }> {
  if (groupBy === "none") {
    return [{ key: "all", count: issues.length, issues }];
  }
  const map = new Map<string, T[]>();
  for (const issue of issues) {
    let key: string;
    if (groupBy === "priority") {
      key = issue.labels.find((label) => label.startsWith("priority:")) ?? "priority: unset";
    } else {
      key = issue.labels[0] ?? "unlabeled";
    }
    const bucket = map.get(key) ?? [];
    bucket.push(issue);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .map(([key, bucket]) => ({ key, count: bucket.length, issues: bucket }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export async function toolIssuesOpenSummary(args: {
  labels?: string[];
  limit?: number;
  groupBy?: "priority" | "label" | "none";
  includeBodies?: boolean;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const limit = clampLimit(args.limit, 30, 100);
    const { totalOpen, issues } = await listOpenIssues(ctx, {
      labels: args.labels,
      limit,
      includeBodies: args.includeBodies === true,
    });
    const groups = groupIssues(issues, args.groupBy ?? "none");
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      totalOpen,
      returned: issues.length,
      groups,
    });
  });
}

export async function toolPrsMergedSince(args: {
  since?: string;
  limit?: number;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const sinceDate = parseSinceDays(args.since, 14);
    const limit = clampLimit(args.limit, 20, 50);
    const prs = await searchMergedPullRequests(ctx, { since: sinceDate, limit });
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      since: sinceDate.toISOString().slice(0, 10),
      prs: prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        mergedAt: pr.mergedAt,
        author: pr.author,
        url: pr.url,
        labels: pr.labels,
        closingIssues: parseClosingIssueRefs(`${pr.title}\n${pr.body}`),
      })),
    });
  });
}

export async function toolIssuePrAlignment(args: {
  issueNumbers?: number[];
  limit?: number;
  prWindow?: string;
  includeOpenPrs?: boolean;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const limit = clampLimit(args.limit, 20, 50);
    const sinceDate = parseSinceDays(args.prWindow, 30);
    const includeOpenPrs = args.includeOpenPrs !== false;

    const mergedPrs = await searchMergedPullRequests(ctx, {
      since: sinceDate,
      limit: 100,
    });
    const openPrs = includeOpenPrs ? await listOpenPullRequests(ctx, { limit: 50 }) : [];

    const prIndex = [...mergedPrs, ...openPrs].map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.mergedAt ? "merged" : pr.state,
      mergedAt: pr.mergedAt,
      url: pr.url,
      body: pr.body,
      closingIssues: parseClosingIssueRefs(`${pr.title}\n${pr.body}`),
    }));

    let issueNumbers = args.issueNumbers;
    if (!issueNumbers || issueNumbers.length === 0) {
      const { issues } = await listOpenIssues(ctx, {
        limit,
        includeBodies: false,
      });
      issueNumbers = issues.map((issue) => issue.number);
    }

    const results = [];
    for (const issueNumber of issueNumbers.slice(0, limit)) {
      const issue = await getIssue(ctx, issueNumber);
      const linkedPrs = prIndex
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          mergedAt: pr.mergedAt,
          url: pr.url,
          relation: relationForIssue(issueNumber, issue.title, pr),
        }))
        .filter((pr) => pr.relation !== "none");

      results.push({
        issue: {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels,
          url: issue.url,
        },
        linkedPrs,
        alignment: inferAlignment({ linkedPrs }),
        remainingWork: extractRemainingWork(issue.body),
      });
    }

    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      prWindowSince: sinceDate.toISOString().slice(0, 10),
      analyzedIssues: results.length,
      results,
    });
  });
}

export async function toolCiFailureSummary(args: {
  runId?: number;
  prNumber?: number;
  branch?: string;
  workflow?: string;
  maxLogChars?: number;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const maxLogChars = clampLimit(args.maxLogChars, 4096, 8192);
    let runId = args.runId;

    if (!runId && args.prNumber) {
      const failed = await findLatestFailedRunForPr(ctx, args.prNumber);
      if (!failed) {
        return jsonResult(
          {
            success: false,
            code: "NO_FAILED_RUN",
            message: `No failed run found for PR #${args.prNumber}.`,
          },
          true,
        );
      }
      runId = failed.id;
    }

    if (!runId) {
      const runs = await listWorkflowRuns(ctx, {
        branch: args.branch,
        limit: 30,
      });
      const failedRun = runs.find(
        (run) =>
          run.conclusion === "failure" &&
          (!args.workflow || run.name.toLowerCase().includes(args.workflow.toLowerCase())),
      );
      if (!failedRun) {
        return jsonResult(
          {
            success: false,
            code: "NO_FAILED_RUN",
            message: "No failed workflow run found for the given filters.",
          },
          true,
        );
      }
      runId = failedRun.id;
    }

    const jobs = await listJobsForRun(ctx, runId);
    const run = await getWorkflowRun(ctx, runId);
    const failedJobs = [];
    for (const job of jobs.filter((item) => item.conclusion === "failure")) {
      const failedSteps = job.steps
        .filter((step) => step.conclusion === "failure")
        .map((step) => step.name);
      let logExcerpt: string | undefined;
      try {
        const raw = await downloadJobLogExcerpt(ctx, job.id, maxLogChars);
        logExcerpt = tailLogLines(raw, 40);
      } catch {
        logExcerpt = undefined;
      }
      failedJobs.push({
        name: job.name,
        failedSteps,
        logExcerpt: logExcerpt ? truncateText(logExcerpt, maxLogChars) : undefined,
      });
    }

    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      runId,
      workflow: run?.name,
      conclusion: run?.conclusion ?? "failure",
      url: run?.url,
      branch: run?.headBranch,
      failedJobs,
    });
  });
}

function buildAlignmentComment(input: {
  issueNumber: number;
  linkedPrs: Array<{ number: number; title: string; state: string; url: string; relation: string }>;
  alignment: string;
  remainingWork?: string;
}): string {
  const prLines =
    input.linkedPrs.length === 0
      ? "_No related PRs found in the search window._"
      : input.linkedPrs
          .map((pr) => `- #${pr.number} (${pr.state}, ${pr.relation}): [${pr.title}](${pr.url})`)
          .join("\n");
  const remaining = input.remainingWork ? `\n\n### Remaining work\n\n${input.remainingWork}` : "";
  return [
    "## Issue ↔ PR alignment",
    "",
    `Issue #${input.issueNumber} — **${input.alignment}**`,
    "",
    "### Related PRs",
    "",
    prLines,
    remaining,
    "",
    "---",
    "_Posted via FTC Dev Tools maintainer MCP._",
  ].join("\n");
}

export async function toolIssueComment(args: {
  issueNumber: number;
  body?: string;
  yes?: boolean;
  template?: "alignment" | "none";
  prWindow?: string;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    let body = args.body?.trim() ?? "";

    if (args.template === "alignment") {
      const alignment = await toolIssuePrAlignment({
        issueNumbers: [args.issueNumber],
        prWindow: args.prWindow,
        limit: 1,
      });
      const payload = JSON.parse(
        alignment.content.find((item) => item.type === "text")?.text ?? "{}",
      ) as {
        results?: Array<{
          linkedPrs: Array<{
            number: number;
            title: string;
            state: string;
            url: string;
            relation: string;
          }>;
          alignment: string;
          remainingWork?: string;
        }>;
      };
      const first = payload.results?.[0];
      body = buildAlignmentComment({
        issueNumber: args.issueNumber,
        linkedPrs: first?.linkedPrs ?? [],
        alignment: first?.alignment ?? "unclear",
        remainingWork: first?.remainingWork,
      });
    }

    if (!body) {
      return jsonResult(
        { success: false, code: "BODY_REQUIRED", message: "Provide body or template=alignment." },
        true,
      );
    }

    if (args.yes !== true) {
      return jsonResult({
        preview: true,
        issueNumber: args.issueNumber,
        repo: `${ctx.repo.owner}/${ctx.repo.name}`,
        body,
      });
    }

    const { commentUrl } = await createIssueComment(ctx, args.issueNumber, body);
    return jsonResult({
      preview: false,
      issueNumber: args.issueNumber,
      commentUrl,
    });
  });
}

export async function toolOpenPrsSummary(args: {
  limit?: number;
  author?: string;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const limit = clampLimit(args.limit, 20, 50);
    let prs = await listOpenPullRequests(ctx, { limit: 100 });
    if (args.author) {
      prs = prs.filter((pr) => pr.author.toLowerCase() === args.author!.toLowerCase());
    }
    prs = prs.slice(0, limit);
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      returned: prs.length,
      prs: prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.author,
        draft: pr.draft ?? false,
        url: pr.url,
        labels: pr.labels,
        updatedAt: pr.updatedAt,
        closingIssues: parseClosingIssueRefs(`${pr.title}\n${pr.body}`),
      })),
    });
  });
}

export async function toolIssueShow(args: {
  issueNumber: number;
  maxBodyChars?: number;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const issue = await getIssue(ctx, args.issueNumber);
    const maxBodyChars = clampLimit(args.maxBodyChars, 4000, 8000);
    const acceptanceCriteria = parseAcceptanceCriteria(issue.body);
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      issue: {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels,
        url: issue.url,
        body: truncateText(issue.body, maxBodyChars),
        acceptanceCriteria,
        remainingWork: extractRemainingWork(issue.body),
      },
    });
  });
}

export async function toolIssuesSearch(args: {
  query: string;
  state?: "open" | "closed" | "all";
  limit?: number;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const limit = clampLimit(args.limit, 20, 50);
    const issues = await searchIssues(ctx, {
      query: args.query,
      state: args.state ?? "open",
      limit,
    });
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      query: args.query,
      state: args.state ?? "open",
      returned: issues.length,
      issues,
    });
  });
}

export async function toolIssueLabelCheck(args: {
  issueNumbers?: number[];
  limit?: number;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const catalog = await loadCatalog(ctx);
    const limit = clampLimit(args.limit, 30, 100);
    let targets: Array<{ number: number; title: string; state: string; labels: string[] }> = [];

    if (args.issueNumbers?.length) {
      for (const number of args.issueNumbers.slice(0, limit)) {
        const issue = await getIssue(ctx, number);
        targets.push(issue);
      }
    } else {
      const { issues } = await listOpenIssues(ctx, { limit, includeBodies: false });
      targets = issues;
    }

    const results = targets.map((issue) => {
      const validation = validateIssueLabels({
        title: issue.title,
        state: issue.state,
        labels: issue.labels,
        catalog,
      });
      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels,
        ok: validation.ok,
        problems: validation.problems,
        expectedLabels: validation.expectedLabels,
      };
    });

    const failed = results.filter((item) => !item.ok).length;
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      checked: results.length,
      failed,
      results,
    });
  });
}

export async function toolReleaseDiff(args: {
  baseTag?: string;
  compareBranch?: string;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const compareBranch = args.compareBranch ?? "main";
    const latest = args.baseTag ? undefined : await getLatestRelease(ctx);
    const baseTag = args.baseTag ?? latest!.tag;
    const compare = await compareRefs(ctx, baseTag, compareBranch);
    return jsonResult({
      repo: `${ctx.repo.owner}/${ctx.repo.name}`,
      latestRelease: latest,
      baseTag,
      compareBranch,
      commitsSinceRelease: compare.aheadBy,
      recentCommits: compare.commits,
    });
  });
}

export async function toolIssueCreatePreview(args: {
  title: string;
  body?: string;
  labels?: string[];
  yes?: boolean;
}): Promise<CallToolResult> {
  return withContext(async (ctx) => {
    const catalog = await loadCatalog(ctx);
    const catalogLabels = catalogLabelsForTitle(catalog, args.title);
    const labels = args.labels ?? catalogLabels ?? [];
    const body = args.body?.trim() ?? "## Summary\n\n(TBD)\n";

    if (args.yes !== true) {
      return jsonResult({
        preview: true,
        repo: `${ctx.repo.owner}/${ctx.repo.name}`,
        title: args.title,
        body,
        labels,
        catalogMatch: Boolean(catalogLabels),
        hint: catalogLabels
          ? "Labels matched issue-label-catalog.json by exact title."
          : "No catalog entry for this title; provide labels explicitly.",
      });
    }

    if (labels.length === 0) {
      return jsonResult(
        {
          success: false,
          code: "LABELS_REQUIRED",
          message: "Cannot create issue without labels. Provide labels or use a catalog title.",
        },
        true,
      );
    }

    const created = await createIssue(ctx, { title: args.title, body, labels });
    return jsonResult({
      preview: false,
      issueNumber: created.number,
      issueUrl: created.url,
      title: args.title,
      labels,
    });
  });
}
