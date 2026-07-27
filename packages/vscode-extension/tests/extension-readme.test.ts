import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("extension VSIX readme packaging", () => {
  it("includes README.md and does not exclude it from the VSIX", () => {
    const readmePath = path.join(root, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toContain("FTC Dev Tools");
    expect(readme).toContain("The Allsparks");

    const ignorePath = path.join(root, ".vscodeignore");
    const ignore = fs.readFileSync(ignorePath, "utf8");
    for (const line of ignore.split("\n")) {
      const trimmed = line.trim();
      expect(trimmed).not.toBe("README.md");
      expect(trimmed).not.toBe("CHANGELOG.md");
    }
  });

  it("includes CHANGELOG.md for version notes", () => {
    const changelogPath = path.join(root, "CHANGELOG.md");
    expect(fs.existsSync(changelogPath)).toBe(true);
    expect(fs.readFileSync(changelogPath, "utf8")).toContain("0.1.0");
  });
});
