import { describe, expect, it } from "vitest";
import { getStartHereStep } from "../src/onboarding/start-here-steps.js";

describe("first-opmode Start Here step (#42)", () => {
  it("prefers guided journey before individual commands", () => {
    const step = getStartHereStep("first-opmode");
    expect(step.commandIds?.[0]).toBe("ftc.firstOpModeJourney");
  });

  it("chains create, validate, deploy, and logs fallbacks", () => {
    const step = getStartHereStep("first-opmode");
    expect(step.commandIds).toEqual([
      "ftc.firstOpModeJourney",
      "ftc.opmodeCreate",
      "ftc.configValidate",
      "ftc.buildAndDeploy",
      "ftc.viewLogs",
    ]);
  });
});
