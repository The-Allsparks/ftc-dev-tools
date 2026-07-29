import { describe, expect, it } from "vitest";
import { buildGettingStartedTreeNodes } from "../src/views/getting-started-nodes.js";

describe("buildGettingStartedTreeNodes", () => {
  it("lists Start Here first", () => {
    const nodes = buildGettingStartedTreeNodes([]);
    expect(nodes).toHaveLength(7);
    expect(nodes[0]?.commandId).toBe("ftc.startHere");
    expect(nodes[0]?.description).toBe("0/8 steps — guided checklist + doc");
  });

  it("marks computer and doctor rows when machine-checks is complete", () => {
    const nodes = buildGettingStartedTreeNodes(["machine-checks"]);
    expect(nodes[0]?.label).toContain("circle-outline");
    expect(nodes[1]?.label).toContain("$(check)");
    expect(nodes[2]?.label).toContain("$(check)");
  });

  it("wires palette command IDs for each row", () => {
    const nodes = buildGettingStartedTreeNodes([]);
    expect(nodes.map((n) => n.commandId)).toEqual([
      "ftc.startHere",
      "ftc.runDoctor",
      "ftc.setUpComputer",
      "ftc.obtainProject",
      "ftc.setUpProject",
      "ftc.connectRobotUsb",
      "ftc.firstOpModeJourney",
    ]);
  });
});
