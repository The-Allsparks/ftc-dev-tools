#!/usr/bin/env node
/**
 * When a pull request merges, close linked open issues that pass close-guard rules.
 *
 * Reads the pull_request payload from GITHUB_EVENT_PATH (Actions) or env overrides.
 */
import fs from "node:fs";
import {
  buildCloseBlockers,
  isEpicIssue,
  issueMayClose,
  mergeLinkedIssues,
  parseClosingIssueNumbers,
} from "./issue-close-guard-logic.mjs";

const token = process.env.GITHUB_TOKEN?.trim();
const repoFull = process.env.GITHUB_REPOSITORY?.trim();

if (!token || !repoFull) {
  console.error("pr-merge-close-issues: GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  process.exit(1);
}

const [owner, repo] = repoFull.split("/");
if (!owner || !repo) {
  console.error("pr-merge-close-issues: invalid GITHUB_REPOSITORY");
  process.exit(1);
}

function loadPullRequest() {
  const eventPath = process.env.GITHUB_EVENT_PATH?.trim();
  if (eventPath && fs.existsSync(eventPath)) {
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    if (event.pull_request) return event.pull_request;
  }
  const number = Number.parseInt(process.env.PR_NUMBER ?? "", 10);
  if (!Number.isFinite(number)) {
    throw new Error("No pull_request in event and PR_NUMBER not set");
  }
  return { number, merged: true, body: process.env.PR_BODY ?? "", title: process.env.PR_TITLE ?? "" };
}

async function githubRest(path, init) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`REST ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function githubGraphql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors?.length) {
    const msg = body.errors?.map((e) => e.message).join("; ") ?? res.statusText;
    throw new Error(`GraphQL failed: ${msg}`);
  }
  return body.data;
}

async function fetchIssue(issueNumber) {
  return githubRest(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

async function fetchLinkedPullRequestsForIssue(issueNumber) {
  const q = encodeURIComponent(`repo:${owner}/${repo} is:pr linked:issue-${issueNumber}`);
  const search = await githubRest(`/search/issues?q=${q}&per_page=100`);
  const items = search.items ?? [];
  const pulls = [];
  for (const item of items) {
    if (!item.pull_request) continue;
    const pr = await githubRest(`/repos/${owner}/${repo}/pulls/${item.number}`);
    pulls.push({
      number: pr.number,
      title: pr.title,
      merged: Boolean(pr.merged),
      state: pr.state?.toUpperCase() ?? "UNKNOWN",
    });
  }
  return pulls;
}

async function fetchLinkedChildIssues(issueNumber) {
  const query = `
    query IssueChildren($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          subIssues(first: 100) {
            nodes { number title state }
          }
          trackedIssues(first: 100) {
            nodes { number title state }
          }
        }
      }
    }
  `;
  const data = await githubGraphql(query, { owner, repo, number: issueNumber });
  const issue = data.repository?.issue;
  if (!issue) return [];
  return mergeLinkedIssues(issue.subIssues?.nodes ?? [], issue.trackedIssues?.nodes ?? []);
}

async function fetchIssuesLinkedToPullRequest(prNumber) {
  const q = encodeURIComponent(`repo:${owner}/${repo} is:issue linked:pr-${prNumber} state:open`);
  const search = await githubRest(`/search/issues?q=${q}&per_page=100`);
  return (search.items ?? []).map((item) => item.number);
}

function labelNamesFromIssue(issue) {
  return (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean);
}

async function closeIssueWithComment(issueNumber, prNumber) {
  await githubRest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
  const body = [
    `Closed automatically because linked pull request #${prNumber} was merged.`,
    "",
    "If this was premature, reopen the issue or adjust PR/issue links.",
  ].join("\n");
  await githubRest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const pullRequest = loadPullRequest();
  if (!pullRequest.merged) {
    console.log("pr-merge-close-issues: pull request not merged; skipping");
    return;
  }

  const prNumber = pullRequest.number;
  const text = `${pullRequest.title ?? ""}\n${pullRequest.body ?? ""}`;
  const candidates = new Set([
    ...parseClosingIssueNumbers(text, { owner, repo }),
    ...(await fetchIssuesLinkedToPullRequest(prNumber)),
  ]);

  console.log(`pr-merge-close-issues: PR #${prNumber} merged; candidates: ${[...candidates].join(", ") || "(none)"}`);

  for (const issueNumber of candidates) {
    if (issueNumber === prNumber) continue;

    let issue;
    try {
      issue = await fetchIssue(issueNumber);
    } catch (err) {
      console.warn(`  #${issueNumber}: skip (${err.message ?? err})`);
      continue;
    }

    if (issue.pull_request) {
      console.log(`  #${issueNumber}: skip (is a pull request)`);
      continue;
    }
    if (issue.state !== "open") {
      console.log(`  #${issueNumber}: already ${issue.state.toLowerCase()}`);
      continue;
    }

    const labelNames = labelNamesFromIssue(issue);
    if (isEpicIssue(labelNames)) {
      console.log(`  #${issueNumber}: skip (epic — close manually after sub-issues)`);
      continue;
    }

    const linkedPullRequests = await fetchLinkedPullRequestsForIssue(issueNumber);
    const linkedIssues = [];
    if (!issueMayClose(labelNames, linkedIssues, linkedPullRequests)) {
      const blockers = buildCloseBlockers(linkedIssues, linkedPullRequests, { isEpic: false });
      console.log(`  #${issueNumber}: not ready — ${blockers.join("; ")}`);
      continue;
    }

    await closeIssueWithComment(issueNumber, prNumber);
    console.log(`  #${issueNumber}: closed`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
