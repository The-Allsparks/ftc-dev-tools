import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL,
  buildGitCloneCommand,
  deriveCloneDirectoryName,
  normalizeGitCloneUrl,
} from "../src/onboarding/obtain-project.js";

describe("obtain-project helpers", () => {
  it("exposes official SDK template URL", () => {
    expect(OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL).toContain("FtcRobotController");
  });

  it("normalizes https and ssh GitHub URLs", () => {
    expect(normalizeGitCloneUrl("https://github.com/my-team/robot.git")).toBe(
      "https://github.com/my-team/robot.git",
    );
    expect(normalizeGitCloneUrl("git@github.com:FIRST-Tech-Challenge/FtcRobotController.git")).toBe(
      OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL,
    );
    expect(normalizeGitCloneUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("derives folder names from clone URLs", () => {
    expect(deriveCloneDirectoryName(OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL)).toBe(
      "FtcRobotController",
    );
  });

  it("builds a git clone shell command", () => {
    expect(buildGitCloneCommand(OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL, "FtcRobotController")).toBe(
      'git clone https://github.com/FIRST-Tech-Challenge/FtcRobotController.git "FtcRobotController"',
    );
  });
});
