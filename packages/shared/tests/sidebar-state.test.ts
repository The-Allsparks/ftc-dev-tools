import { describe, expect, it } from "vitest";
import { computeSidebarState } from "../src/readiness/sidebar-state.js";

describe("computeSidebarState", () => {
  it("welcomes user when no folder is open", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: false,
      project: { detected: false },
      device: { phase: "no-devices" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    expect(state.phase).toBe("welcome-no-folder");
    expect(state.primaryAction?.commandId).toBe("ftc.obtainProject");
    expect(state.showBuildActions).toBe(false);
  });

  it("prompts to open FTC project when layout is unrecognized", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: false },
      device: { phase: "no-devices" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    expect(state.phase).toBe("welcome-no-project");
    expect(state.showBuildActions).toBe(false);
  });

  it("recommends authorization when device is unauthorized", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "unauthorized" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    expect(state.phase).toBe("authorize-robot");
    expect(state.primaryAction?.commandId).toBe("ftc.connectRobotUsb");
  });

  it("recommends connect when project is open but no device", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "no-devices" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    expect(state.phase).toBe("connect-robot");
    expect(state.primaryAction?.commandId).toBe("ftc.connectRobotUsb");
  });

  it("recommends build and deploy when robot is connected", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected", serial: "ABC123", isControlHub: true },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    expect(state.phase).toBe("ready-to-build");
    expect(state.primaryAction?.commandId).toBe("ftc.buildAndDeploy");
    expect(state.showBuildActions).toBe(true);
  });

  it("recommends deploy after a successful build", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected", serial: "ABC123" },
      milestones: ["build-ok"],
      hasSuccessfulBuild: true,
    });
    expect(state.phase).toBe("ready-to-deploy");
    expect(state.primaryAction?.commandId).toBe("ftc.deploy");
  });

  it("prompts for OpMode after deploy", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected", serial: "ABC123" },
      milestones: ["build-ok", "deploy-ok"],
      hasSuccessfulBuild: true,
    });
    expect(state.phase).toBe("run-opmode");
    expect(state.primaryAction?.commandId).toBe("ftc.firstOpModeJourney");
  });

  it("shows all-set when deploy and opmode milestones are complete", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected", serial: "ABC123" },
      milestones: ["build-ok", "deploy-ok", "opmode-on-driver-station"],
      hasSuccessfulBuild: true,
    });
    expect(state.phase).toBe("all-set");
    expect(state.primaryAction?.commandId).toBe("ftc.buildAndDeploy");
  });
});
