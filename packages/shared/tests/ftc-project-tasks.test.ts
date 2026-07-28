import { describe, expect, it } from "vitest";
import { buildFtcProjectTasksDocument } from "../src/setup/project-setup-files.js";

describe("buildFtcProjectTasksDocument", () => {
  it("generates shell tasks when CLI mode is selected", () => {
    const doc = buildFtcProjectTasksDocument("cli");
    expect(doc.version).toBe("2.0.0");
    const tasks = doc.tasks as Record<string, unknown>[];
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      label: "FTC: Build Robot Code",
      type: "shell",
      command: "ftc",
      args: ["build"],
      group: { kind: "build", isDefault: true },
    });
    expect(tasks[1]).toMatchObject({
      label: "FTC: Deploy to Robot",
      type: "shell",
      command: "ftc",
      args: ["deploy"],
    });
    expect(tasks.every((t) => !String(t.label).includes("Remind"))).toBe(true);
  });

  it("generates extension-backed tasks when extension mode is selected", () => {
    const doc = buildFtcProjectTasksDocument("extension");
    const tasks = doc.tasks as Record<string, unknown>[];
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      label: "FTC: Build Robot Code",
      type: "ftc-dev-tools",
      action: "build",
      group: { kind: "build", isDefault: true },
    });
    expect(tasks[2]).toMatchObject({
      label: "FTC: Build and Deploy",
      action: "buildAndDeploy",
    });
  });
});
