import { describe, expect, it } from "vitest";
import { markdownCommandLink } from "../src/onboarding/ftc-command-titles.js";
import { renderStartHereMarkdown } from "../src/onboarding/start-here-markdown.js";

describe("markdownCommandLink", () => {
  it("encodes command args for VS Code preview", () => {
    const link = markdownCommandLink("ftc.runInstallDeps", {
      label: "Install",
      args: [{ source: "start-here" }],
    });
    expect(link).toContain("(command:ftc.runInstallDeps?");
    expect(link).toContain(encodeURIComponent(JSON.stringify([{ source: "start-here" }])));
  });
});

describe("renderStartHereMarkdown", () => {
  it("marks current step in checklist", () => {
    const md = renderStartHereMarkdown({
      completed: ["intro"],
      activeStepId: "machine-checks",
    });
    expect(md).toContain("← **current**");
    expect(md).toContain("- [x] Welcome");
  });

  it("includes clickable command links for resume and step commands", () => {
    const md = renderStartHereMarkdown({
      completed: [],
      activeStepId: "build",
    });
    expect(md).toContain("[Resume Start Here wizard](command:ftc.startHere)");
    expect(md).toContain("[FTC: Build Robot Code](command:ftc.build)");
  });
});
