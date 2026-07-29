/**
 * Pure rules for whether an issue may be closed (epic sub-issues, linked PRs).
 */

/**
 * @param {{ number: number, title?: string, state: string }[]} linkedIssues
 * @param {{ number: number, title?: string, merged: boolean, state?: string }[]} linkedPullRequests
 * @param {{ isEpic: boolean }} options
 * @returns {string[]}
 */
export function buildCloseBlockers(linkedIssues, linkedPullRequests, { isEpic }) {
  const blockers = [];

  for (const pr of linkedPullRequests) {
    if (!pr.merged) {
      const stateHint = pr.state === "OPEN" ? "open" : "not merged";
      blockers.push(
        `Linked pull request #${pr.number} must be merged before closing (currently ${stateHint}).`,
      );
    }
  }

  if (isEpic) {
    const openChildren = linkedIssues.filter((issue) => issue.state === "OPEN");
    for (const child of openChildren) {
      const title = child.title ? `: ${child.title}` : "";
      blockers.push(`Sub-issue #${child.number}${title} is still open.`);
    }
  }

  return blockers;
}

export function parseLabelNames(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isEpicIssue(labelNames) {
  return labelNames.includes("epic");
}

/**
 * Dedupe issue rows by number (sub-issues + tracked issues).
 * @param {{ number: number, title?: string, state: string }[]} lists
 */
export function mergeLinkedIssues(...lists) {
  const byNumber = new Map();
  for (const list of lists) {
    for (const issue of list) {
      if (!byNumber.has(issue.number)) {
        byNumber.set(issue.number, issue);
      }
    }
  }
  return [...byNumber.values()];
}
