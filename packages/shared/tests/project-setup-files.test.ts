import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  mergeExtensionsJson,
  mergeFtcWorkspaceSettings,
  backupFileBeforeWrite,
  restoreSetupBackup,
  listSetupBackups,
  formatJsonFile,
} from "../src/setup/project-setup-files.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("mergeExtensionsJson", () => {
  it("is idempotent when merged twice", () => {
    const once = mergeExtensionsJson({ recommendations: ["other.extension"] });
    const twice = mergeExtensionsJson(once);
    expect(twice).toEqual(once);
  });

  it("preserves unrelated keys", () => {
    const merged = mergeExtensionsJson({ unwantedRecommendations: ["x"], recommendations: [] });
    expect(merged.unwantedRecommendations).toEqual(["x"]);
  });
});

describe("mergeFtcWorkspaceSettings", () => {
  it("strips ftc.preferredDeviceSerial even when present in input", () => {
    const merged = mergeFtcWorkspaceSettings({
      "ftc.preferredDeviceSerial": "ABC123456789",
      "editor.tabSize": 4,
    });
    expect(merged).not.toHaveProperty("ftc.preferredDeviceSerial");
    expect(merged["editor.tabSize"]).toBe(4);
  });
});

describe("setup backup helpers", () => {
  it("backs up before write and restores roundtrip", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-setup-backup-"));
    tempDirs.push(root);

    const target = path.join(root, ".vscode", "settings.json");
    await fs.mkdir(path.dirname(target), { recursive: true });
    const original = formatJsonFile({ alpha: 1 });
    await fs.writeFile(target, original, "utf8");

    await backupFileBeforeWrite(root, target);

    const overwritten = formatJsonFile({ beta: 2 });
    await fs.writeFile(target, overwritten, "utf8");

    const backups = await listSetupBackups(root);
    expect(backups.length).toBeGreaterThan(0);

    const result = await restoreSetupBackup(root, backups[0]!.id);
    expect(result.success).toBe(true);
    expect(result.restoredPaths).toContain(".vscode/settings.json");

    const restored = await fs.readFile(target, "utf8");
    expect(restored).toBe(original);
  });
});
