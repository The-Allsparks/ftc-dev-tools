import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDefaultFtcDevJsonDocument,
  buildFtcProjectSetupPlans,
} from "../src/setup/project-setup-plan.js";
import { formatJsonFile } from "../src/setup/project-setup-files.js";

const SERIAL_LIKE_PATTERNS = [
  /preferredDeviceSerial/i,
  /"ftc\.preferredDeviceSerial"/,
  /deviceSerial/i,
];

function assertNoSerialPatterns(content: string): void {
  for (const pattern of SERIAL_LIKE_PATTERNS) {
    expect(content).not.toMatch(pattern);
  }
}

function emptyProjectRoot(): string {
  return path.join(os.tmpdir(), "ftc-project-setup-test");
}

describe("buildDefaultFtcDevJsonDocument", () => {
  it("does not include preferredDeviceSerial", () => {
    const doc = buildDefaultFtcDevJsonDocument();
    expect(doc).not.toHaveProperty("preferredDeviceSerial");
    const deployment = doc.deployment as Record<string, unknown> | undefined;
    expect(deployment?.preferredDeviceSerial).toBeUndefined();
    assertNoSerialPatterns(formatJsonFile(doc));
  });
});

describe("buildFtcProjectSetupPlans", () => {
  it("plans four files for an empty project (extension tasks mode)", () => {
    const root = emptyProjectRoot();
    const result = buildFtcProjectSetupPlans({
      projectRoot: root,
      tasksMode: "extension",
      cliOnPath: false,
      ftcDevJson: null,
      extensionsJson: null,
      settingsJson: null,
      tasksJson: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.plans).toHaveLength(4);
    for (const plan of result.plans) {
      assertNoSerialPatterns(plan.content);
    }
  });

  it("plans only extensions and settings when .ftc-dev.json and tasks.json exist", () => {
    const root = emptyProjectRoot();
    const result = buildFtcProjectSetupPlans({
      projectRoot: root,
      tasksMode: "cli",
      cliOnPath: true,
      ftcDevJson: formatJsonFile({ module: "TeamCode" }),
      extensionsJson: null,
      settingsJson: null,
      tasksJson: formatJsonFile({ version: "2.0.0", tasks: [] }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.plans).toHaveLength(2);
    expect(result.plans.map((p) => path.basename(p.path))).toEqual([
      "extensions.json",
      "settings.json",
    ]);
  });

  it("returns error without plans when existing JSON is invalid", () => {
    const root = emptyProjectRoot();
    const settingsPath = path.join(root, ".vscode", "settings.json");
    const result = buildFtcProjectSetupPlans({
      projectRoot: root,
      tasksMode: "extension",
      cliOnPath: false,
      ftcDevJson: null,
      extensionsJson: null,
      settingsJson: "{ not-json",
      tasksJson: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.invalidPath).toBe(settingsPath);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("strips serial-like settings from merged settings.json plan", () => {
    const root = emptyProjectRoot();
    const result = buildFtcProjectSetupPlans({
      projectRoot: root,
      tasksMode: "extension",
      cliOnPath: false,
      ftcDevJson: formatJsonFile({ module: "TeamCode" }),
      extensionsJson: null,
      settingsJson: formatJsonFile({ "ftc.preferredDeviceSerial": "HUB-SERIAL-001" }),
      tasksJson: formatJsonFile({ version: "2.0.0", tasks: [] }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const settingsPlan = result.plans.find((p) => p.path.endsWith("settings.json"));
    expect(settingsPlan).toBeDefined();
    assertNoSerialPatterns(settingsPlan!.content);
  });

  it("preview plan count matches writable targets for fresh repo", () => {
    const root = path.join(os.tmpdir(), "fresh-ftc-team");
    const result = buildFtcProjectSetupPlans({
      projectRoot: root,
      tasksMode: "cli",
      cliOnPath: true,
      ftcDevJson: null,
      extensionsJson: null,
      settingsJson: null,
      tasksJson: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.plans).toHaveLength(4);
    const basenames = result.plans.map((p) => path.basename(p.path));
    expect(basenames).toContain(".ftc-dev.json");
    expect(basenames).toContain("extensions.json");
    expect(basenames).toContain("settings.json");
    expect(basenames).toContain("tasks.json");
  });
});
