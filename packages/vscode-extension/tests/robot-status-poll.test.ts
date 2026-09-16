import { describe, expect, it } from "vitest";
import { shouldPollRobotStatus } from "../src/robot-status-poll.js";

describe("robot status poll policy", () => {
  it("polls only when the robot view is visible and the window is focused", () => {
    expect(shouldPollRobotStatus(true, true)).toBe(true);
    expect(shouldPollRobotStatus(true, false)).toBe(false);
    expect(shouldPollRobotStatus(false, true)).toBe(false);
    expect(shouldPollRobotStatus(false, false)).toBe(false);
  });
});
