import { describe, expect, it } from "vitest";
import { formatDriverStationInitStartMessage } from "../src/onboarding/first-opmode-journey.js";

describe("first OpMode journey copy (#42)", () => {
  it("explains Driver Station Init and Start in plain language", () => {
    const text = formatDriverStationInitStartMessage();
    expect(text).toContain("Init");
    expect(text).toContain("Start");
    expect(text).toContain("OpMode");
  });
});
