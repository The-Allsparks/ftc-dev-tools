#!/usr/bin/env node
/**
 * Validate issue closure: linked PRs merged; epics require all sub-issues closed.
 *
 * Usage (CI):
 *   node scripts/issue-close-guard.mjs --enforce
 *
 * Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), ISSUE_NUMBER, ISSUE_LABELS (comma-separated)
 * Writes GITHUB_OUTPUT: allowed, is_epic, blockers (multiline)
 */
import fs from "node:fs";
import {
  buildCloseBlockers,
  isEpicIssue,
  mergeLinkedIssues,
  parseLabelNames,
} from "./issue-close-guard-logic.mjs";

const enforce = process.argv.includes("--enforce");

const token = process.env.GITHUB_TOKEN?.trim();
const repoFull = process.env.GITHUB_REPOSITORY?.trim();
const issueNumberRaw = process.env.ISSUE_NUMBER?.trim();
const labelRaw = process.env.ISSUE_LABELS ?? "";

if (!token || !repoFull || !issueNumberRaw) {
  console.error(
    "issue-close-guard: GITHUB_TOKEN, GITHUB_REPOSITORY, and ISSUE_NUMBER are required",
  );
  process.exit(1);
}

const [owner, repo] = repoFull.split("/");
const issueNumber = Number.parseInt(issueNumberRaw, 10);
if (!owner || !repo || !Number.isFinite(issueNumber)) {
  console.error("issue-close-guard: invalid GITHUB_REPOSITORY or ISSUE_NUMBER");
  process.exit(1);
}

const labelNames = parseLabelNames(labelRaw);
const epic = isEpicIssue(labelNames);

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

async function githubRest(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`REST ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchLinkedChildIssues() {
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
  try {
    const data = await githubGraphql(query, { owner, repo, number: issueNumber });
    const issue = data.repository?.issue;
    if (!issue) return [];
    const sub = issue.subIssues?.nodes ?? [];
    const tracked = issue.trackedIssues?.nodes ?? [];
    return mergeLinkedIssues(sub, tracked);
  } catch (err) {
    if (!epic) return [];
    throw err;
  }
}

async function fetchLinkedPullRequests() {
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

function writeGithubOutput(allowed, blockers) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = [
    `allowed=${allowed ? "true" : "false"}`,
    `is_epic=${epic ? "true" : "false"}`,
    "blockers<<EOF",
    ...blockers,
    "EOF",
  ];
  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function reopenIssue() {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: "open" }),
  });
  if (!res.ok) {
    throw new Error(`Reopen failed: ${res.status} ${await res.text()}`);
  }
}

async function postComment(body) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    throw new Error(`Comment failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const linkedIssues = epic ? await fetchLinkedChildIssues() : [];
  const linkedPullRequests = await fetchLinkedPullRequests();
  const blockers = buildCloseBlockers(linkedIssues, linkedPullRequests, { isEpic: epic });
  const allowed = blockers.length === 0;

  writeGithubOutput(allowed, blockers);

  if (!allowed) {
    console.log("issue-close-guard: blocked");
    for (const b of blockers) console.log(`  - ${b}`);
    if (enforce) {
      await reopenIssue();
      const body = [
        "Closing this issue was **blocked** by repository policy:",
        "",
        ...blockers.map((b) => `- ${b}`),
        "",
        "The issue was reopened automatically. Resolve the items above, then close again.",
      ].join("\n");
      await postComment(body);
    }
    process.exit(0);
  }

  console.log("issue-close-guard: allowed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
