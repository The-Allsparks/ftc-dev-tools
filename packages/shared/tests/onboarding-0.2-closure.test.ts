import { describe, expect, it } from "vitest";
import { FTC_COMMAND_TITLES } from "../src/onboarding/ftc-command-titles.js";
import { START_HERE_STEP_IDS } from "../src/onboarding/start-here-steps.js";
import {
  ONBOARDING_0_2_CHILD_ISSUES,
  ROOKIE_JOURNEY_COMMAND_IDS,
} from "../src/onboarding/onboarding-0.2-closure.js";

describe("0.2 onboarding closure (#45 / #46)", () => {
  it("lists delivered child issues for the epic", () => {
    expect(ONBOARDING_0_2_CHILD_ISSUES.map((i) => i.number)).toEqual([32, 35, 36, 37, 40, 41, 42]);
  });

  it("registers rookie journey command titles", () => {
    for (const id of ROOKIE_JOURNEY_COMMAND_IDS) {
      expect(FTC_COMMAND_TITLES[id], id).toBeTruthy();
    }
  });

  it("covers the Start Here flow through logs", () => {
    expect(START_HERE_STEP_IDS[0]).toBe("intro");
    expect(START_HERE_STEP_IDS).toContain("first-opmode");
    expect(START_HERE_STEP_IDS.at(-1)).toBe("logs");
  });
});
