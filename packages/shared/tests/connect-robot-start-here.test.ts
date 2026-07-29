import { describe, expect, it } from "vitest";
import { getStartHereStep } from "../src/onboarding/start-here-steps.js";

describe("connect-robot Start Here step (#41)", () => {
  it("prefers USB connect command before raw device commands", () => {
    const step = getStartHereStep("connect-robot");
    expect(step.commandIds?.[0]).toBe("ftc.connectRobotUsb");
    expect(step.commandIds).not.toContain("ftc.wifiConnect");
  });

  it("still exposes manual device commands as fallbacks", () => {
    const step = getStartHereStep("connect-robot");
    expect(step.commandIds).toEqual(["ftc.connectRobotUsb", "ftc.showDevices", "ftc.selectDevice"]);
  });
});
