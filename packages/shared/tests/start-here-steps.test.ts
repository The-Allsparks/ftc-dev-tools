import { describe, expect, it } from "vitest";
import {
  START_HERE_STEP_IDS,
  START_HERE_STEPS,
  countStartHereCompleted,
  getNextStartHereStep,
  getStartHereStep,
  normalizeStartHereProgress,
  serializeStartHereProgress,
} from "../src/onboarding/start-here-steps.js";

describe("START_HERE_STEPS", () => {
  it("defines steps in the same order as START_HERE_STEP_IDS", () => {
    expect(START_HERE_STEPS.map((s) => s.id)).toEqual([...START_HERE_STEP_IDS]);
  });

  it("maps each id to a step with title and description", () => {
    for (const id of START_HERE_STEP_IDS) {
      const step = getStartHereStep(id);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("only references known command ids as strings", () => {
    for (const step of START_HERE_STEPS) {
      for (const commandId of step.commandIds ?? []) {
        expect(commandId.startsWith("ftc.")).toBe(true);
      }
    }
  });
});

describe("normalizeStartHereProgress", () => {
  it("returns empty for invalid input", () => {
    expect(normalizeStartHereProgress(undefined)).toEqual([]);
    expect(normalizeStartHereProgress("intro")).toEqual([]);
  });

  it("dedupes and sorts by flow order", () => {
    expect(normalizeStartHereProgress(["deploy", "intro", "intro", "bogus", "build"])).toEqual([
      "intro",
      "build",
      "deploy",
    ]);
  });
});

describe("getNextStartHereStep", () => {
  it("returns the first incomplete step", () => {
    expect(getNextStartHereStep([])?.id).toBe("intro");
    expect(getNextStartHereStep(normalizeStartHereProgress(["intro", "machine-checks"]))?.id).toBe(
      "project-folder",
    );
  });

  it("returns undefined when all steps are complete", () => {
    expect(getNextStartHereStep([...START_HERE_STEP_IDS])).toBeUndefined();
  });
});

describe("serializeStartHereProgress", () => {
  it("matches normalize output", () => {
    const input = new Set(["logs", "intro"] as const);
    expect(serializeStartHereProgress(input)).toEqual(["intro", "logs"]);
  });
});

describe("countStartHereCompleted", () => {
  it("counts only valid step ids", () => {
    expect(countStartHereCompleted(["intro", "nope", "build"])).toBe(2);
  });
});
