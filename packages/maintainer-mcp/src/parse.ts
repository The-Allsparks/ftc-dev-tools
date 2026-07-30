/** Parse GitHub closing keywords from PR/issue bodies and titles. */
const CLOSING_KEYWORD =
  /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)\b/gi;

export function parseClosingIssueRefs(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(CLOSING_KEYWORD)) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) {
      found.add(num);
    }
  }
  return [...found].sort((a, b) => a - b);
}

export function parseMentionIssueRefs(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(/#(\d+)\b/g)) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) {
      found.add(num);
    }
  }
  return [...found].sort((a, b) => a - b);
}

export function extractIssueCodename(title: string): string | undefined {
  const match = title.match(/^([A-Z][A-Z0-9]+-\d+)\s*[—:-]/);
  return match?.[1];
}

export type IssuePrRelation = "closes" | "mentions" | "none";

export function relationForIssue(
  issueNumber: number,
  issueTitle: string,
  pr: { body: string; title: string; closingIssues: number[] },
): IssuePrRelation {
  if (pr.closingIssues.includes(issueNumber)) {
    return "closes";
  }

  const mentions = parseMentionIssueRefs(`${pr.title}\n${pr.body}`);
  if (mentions.includes(issueNumber)) {
    return "mentions";
  }

  const hashTitle = issueTitle.match(/^#(\d+)\b/);
  if (hashTitle && Number(hashTitle[1]) === issueNumber) {
    if (pr.title.includes(`#${issueNumber}`) || pr.title.includes(issueTitle.slice(0, 50))) {
      return "mentions";
    }
  }

  const codename = extractIssueCodename(issueTitle);
  if (codename && pr.title.includes(codename)) {
    return "mentions";
  }

  return "none";
}

export type AlignmentStatus = "likely_closed" | "partial" | "unaddressed" | "unclear";

export function inferAlignment(input: {
  linkedPrs: Array<{ state: string; relation: IssuePrRelation }>;
}): AlignmentStatus {
  const mergedCloses = input.linkedPrs.some(
    (pr) => pr.state === "merged" && pr.relation === "closes",
  );
  if (mergedCloses) {
    return "likely_closed";
  }
  const anyMerged = input.linkedPrs.some((pr) => pr.state === "merged");
  const anyOpen = input.linkedPrs.some((pr) => pr.state === "open");
  if (anyMerged) {
    return "partial";
  }
  if (anyOpen) {
    return "unclear";
  }
  if (input.linkedPrs.length === 0) {
    return "unaddressed";
  }
  return "unclear";
}

export function extractRemainingWork(body: string, maxChars = 500): string | undefined {
  const acMatch = body.match(/## Acceptance criteria[\s\S]*/i);
  const section = acMatch?.[0] ?? body;
  const unchecked = section.match(/^- \[ \].+$/gm);
  if (!unchecked || unchecked.length === 0) {
    return undefined;
  }
  const text = unchecked.slice(0, 8).join("\n");
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

export interface AcceptanceCriteriaItem {
  checked: boolean;
  text: string;
}

export function parseAcceptanceCriteria(body: string): AcceptanceCriteriaItem[] {
  const acMatch = body.match(/## Acceptance criteria[\s\S]*?(?=\n## |\n---|$)/i);
  const section = acMatch?.[0] ?? "";
  const items: AcceptanceCriteriaItem[] = [];
  for (const line of section.split("\n")) {
    const checked = line.match(/^- \[x\]\s+(.+)/i);
    if (checked) {
      items.push({ checked: true, text: checked[1].trim() });
      continue;
    }
    const unchecked = line.match(/^- \[ \]\s+(.+)/);
    if (unchecked) {
      items.push({ checked: false, text: unchecked[1].trim() });
    }
  }
  return items;
}

export function tailLogLines(text: string, maxLines: number): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }
  return lines.slice(-maxLines).join("\n");
}
