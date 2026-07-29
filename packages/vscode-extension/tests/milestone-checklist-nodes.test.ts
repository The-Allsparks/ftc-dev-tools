import { describe, expect, it } from "vitest";
import { buildMilestoneChecklistNodes } from "../src/views/milestone-checklist-nodes.js";

describe("buildMilestoneChecklistNodes", () => {
  it("shows summary and device connections doc link", () => {
    const nodes = buildMilestoneChecklistNodes([]);
    expect(nodes[0]?.label).toBe("0/6 milestones");
    expect(nodes[1]?.commandId).toBe("ftc.openDeviceConnectionsDoc");
  });

  it("checks off completed milestones", () => {
    const nodes = buildMilestoneChecklistNodes(["doctor-ok", "build-ok"]);
    const doctor = nodes.find((n) => n.id === "milestone-doctor-ok");
    expect(doctor?.label).toContain("$(check)");
  });
});
