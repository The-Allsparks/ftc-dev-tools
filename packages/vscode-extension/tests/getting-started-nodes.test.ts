import { describe, expect, it } from "vitest";
import { buildGettingStartedTreeNodes } from "../src/views/getting-started-nodes.js";

describe("buildGettingStartedTreeNodes", () => {
  it("shows unchecked labels when no Start Here progress", () => {
    const nodes = buildGettingStartedTreeNodes([]);
    expect(nodes).toHaveLength(4);
    expect(nodes[0]?.label).toContain("Set Up This Computer");
    expect(nodes[0]?.label).toContain("circle-outline");
    expect(nodes[2]?.description).toBe("0/7 steps complete");
  });

  it("marks computer and doctor rows when machine-checks is complete", () => {
    const nodes = buildGettingStartedTreeNodes(["machine-checks"]);
    expect(nodes[0]?.label).toContain("$(check)");
    expect(nodes[3]?.label).toContain("$(check)");
    expect(nodes[1]?.label).toContain("circle-outline");
  });

  it("wires palette command IDs for each row", () => {
    const nodes = buildGettingStartedTreeNodes([]);
    expect(nodes.map((n) => n.commandId)).toEqual([
      "ftc.setUpComputer",
      "ftc.setUpProject",
      "ftc.startHere",
      "ftc.runDoctor",
    ]);
  });
});
