import { describe, expect, it } from "vitest";
import {
  buildCloseBlockers,
  isEpicIssue,
  issueMayClose,
  mergeLinkedIssues,
  parseClosingIssueNumbers,
  parseLabelNames,
} from "../../../scripts/issue-close-guard-logic.mjs";

describe("issue-close-guard-logic", () => {
  it("blocks when a linked PR is not merged", () => {
    const blockers = buildCloseBlockers([], [{ number: 10, merged: false, state: "OPEN" }], {
      isEpic: false,
    });
    expect(blockers.some((b) => b.includes("#10"))).toBe(true);
  });

  it("allows close when linked PR is merged", () => {
    const blockers = buildCloseBlockers([], [{ number: 10, merged: true, state: "MERGED" }], {
      isEpic: false,
    });
    expect(blockers).toEqual([]);
  });

  it("blocks epic close when a sub-issue is open", () => {
    const blockers = buildCloseBlockers([{ number: 2, state: "OPEN", title: "Child" }], [], {
      isEpic: true,
    });
    expect(blockers.some((b) => b.includes("#2"))).toBe(true);
  });

  it("merges sub-issue lists without duplicates", () => {
    const merged = mergeLinkedIssues(
      [{ number: 1, state: "CLOSED" }],
      [
        { number: 1, state: "CLOSED" },
        { number: 2, state: "OPEN" },
      ],
    );
    expect(merged).toHaveLength(2);
  });

  it("detects epic label", () => {
    expect(isEpicIssue(parseLabelNames("enhancement, epic, priority: P1"))).toBe(true);
    expect(isEpicIssue(parseLabelNames("enhancement"))).toBe(false);
  });

  it("parses closing keywords in PR text", () => {
    const repo = { owner: "The-Allsparks", repo: "ftc-dev-tools" };
    expect(parseClosingIssueNumbers("Fixes #48", repo)).toEqual([48]);
    expect(parseClosingIssueNumbers("Closes The-Allsparks/ftc-dev-tools#99", repo)).toEqual([99]);
    expect(parseClosingIssueNumbers("see #48", repo)).toEqual([]);
  });

  it("issueMayClose respects merged linked PRs", () => {
    expect(issueMayClose([], [], [{ number: 1, merged: true, state: "MERGED" }])).toBe(true);
    expect(issueMayClose([], [], [{ number: 1, merged: false, state: "OPEN" }])).toBe(false);
  });
});
