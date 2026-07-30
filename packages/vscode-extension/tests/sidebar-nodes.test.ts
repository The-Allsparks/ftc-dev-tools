import { describe, expect, it } from "vitest";
import { computeSidebarState } from "@ftc-dev-tools/shared";
import { buildHomeNodes } from "../src/views/home-nodes.js";
import { buildQuickActionNodes } from "../src/views/quick-action-nodes.js";

describe("sidebar home nodes", () => {
  it("surfaces primary action in home section", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected", serial: "ABC" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    const nodes = buildHomeNodes(state);
    expect(nodes.some((n) => n.contextValue === "ftc.sidebar.primaryAction")).toBe(true);
    expect(nodes[0]?.label).toContain("Ready to build");
  });
});

describe("sidebar quick action nodes", () => {
  it("hides build actions when no project is open", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: false,
      project: { detected: false },
      device: { phase: "no-devices" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    const nodes = buildQuickActionNodes(state);
    expect(nodes.some((n) => n.id === "quick-build-deploy")).toBe(false);
    expect(nodes.some((n) => n.id === "quick-start-here")).toBe(true);
  });

  it("shows build and deploy when robot is ready", () => {
    const state = computeSidebarState({
      hasWorkspaceFolder: true,
      project: { detected: true, moduleName: "TeamCode" },
      device: { phase: "connected" },
      milestones: [],
      hasSuccessfulBuild: false,
    });
    const nodes = buildQuickActionNodes(state);
    expect(nodes.some((n) => n.id === "quick-build-deploy")).toBe(true);
  });
});
