import { describe, expect, it } from "vitest";
import {
  MILESTONE_STEP_IDS,
  MILESTONE_STEPS,
  countMilestonesCompleted,
  normalizeMilestoneProgress,
} from "../src/onboarding/milestone-checklist.js";

describe("milestone checklist (#40)", () => {
  it("defines six competition milestones in order", () => {
    expect(MILESTONE_STEPS.map((s) => s.id)).toEqual([...MILESTONE_STEP_IDS]);
    expect(MILESTONE_STEPS).toHaveLength(6);
  });

  it("normalizes and counts progress", () => {
    const progress = normalizeMilestoneProgress(["deploy-ok", "doctor-ok", "bogus"]);
    expect(progress).toEqual(["doctor-ok", "deploy-ok"]);
    expect(countMilestonesCompleted(progress)).toBe(2);
  });
});
