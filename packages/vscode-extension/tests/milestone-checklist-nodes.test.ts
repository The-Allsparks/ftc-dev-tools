import { describe, expect, it } from "vitest";
import { buildMilestoneChecklistNodeSpecs } from "../src/views/journey-nodes.js";

describe("buildMilestoneChecklistNodes", () => {
  it("shows summary and device connections doc link", () => {
    const nodes = buildMilestoneChecklistNodeSpecs([]);
    expect(nodes[0]?.label).toBe("0/6 milestones");
    expect(nodes[1]?.commandId).toBe("ftc.openDeviceConnectionsDoc");
    expect(nodes[1]?.icon).toBe("book");
  });

  it("checks off completed milestones", () => {
    const nodes = buildMilestoneChecklistNodeSpecs(["doctor-ok", "build-ok"]);
    const doctor = nodes.find((n) => n.id === "milestone-doctor-ok");
    expect(doctor?.done).toBe(true);
  });
});
