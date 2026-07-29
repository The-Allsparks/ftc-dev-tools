import { describe, expect, it } from "vitest";
import { renderStartHereMarkdown } from "../src/onboarding/start-here-markdown.js";

describe("renderStartHereMarkdown", () => {
  it("marks current step in checklist", () => {
    const md = renderStartHereMarkdown({
      completed: ["intro"],
      activeStepId: "machine-checks",
    });
    expect(md).toContain("← **current**");
    expect(md).toContain("- [x] Welcome");
  });
});
