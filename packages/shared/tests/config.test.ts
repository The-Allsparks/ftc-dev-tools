import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadProjectConfig, defaultConfig } from "../src/config/load.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("loadProjectConfig", () => {
  it("returns defaults when file is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(dir);
    const result = await loadProjectConfig(dir);
    expect(result.config.module).toBe(defaultConfig().module);
    expect(result.errors).toEqual([]);
  });

  it("warns on unknown properties and secret-like keys", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(dir);
    await fs.writeFile(
      path.join(dir, ".ftc-dev.json"),
      JSON.stringify({
        module: "TeamCode",
        unexpected: true,
        password: "nope",
      }),
    );
    const result = await loadProjectConfig(dir);
    expect(result.warnings.some((w) => w.includes("unexpected"))).toBe(true);
    expect(result.warnings.some((w) => /secret|password/i.test(w))).toBe(true);
  });

  it("validates teamNumber type", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(dir);
    await fs.writeFile(
      path.join(dir, ".ftc-dev.json"),
      JSON.stringify({
        teamNumber: "abc",
      }),
    );
    const result = await loadProjectConfig(dir);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
