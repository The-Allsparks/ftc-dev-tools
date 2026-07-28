import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import { discoverNearbyFtcProjectRoots } from "../src/project/discover-ftc-root.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makeTemp(prefix = "ftc-discover-"): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function writeOfficialFtcRoot(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
  await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\n");
  await fs.writeFile(path.join(root, "gradlew"), "#!/bin/sh\n");
}

describe("discoverNearbyFtcProjectRoots", () => {
  it("finds parent root when cwd is nested TeamCode", async () => {
    const monorepo = await makeTemp();
    const ftcRoot = path.join(monorepo, "FtcRobotController");
    await writeOfficialFtcRoot(ftcRoot);
    const teamCodeOnly = path.join(ftcRoot, "TeamCode");
    await fs.mkdir(path.join(teamCodeOnly, "src", "main", "java"), { recursive: true });

    const adapter = new OfficialFtcProjectAdapter();
    const found = await discoverNearbyFtcProjectRoots(teamCodeOnly, { adapter });
    expect(found[0]).toBe(path.resolve(ftcRoot));
  });

  it("finds sibling FTC root under a shared parent", async () => {
    const parent = await makeTemp();
    const ftcRoot = path.join(parent, "MyTeamSdk");
    await writeOfficialFtcRoot(ftcRoot);
    const visionLib = path.join(parent, "ViDAR");
    await fs.mkdir(visionLib, { recursive: true });
    await fs.writeFile(path.join(visionLib, "README.md"), "vision\n");

    const adapter = new OfficialFtcProjectAdapter();
    const found = await discoverNearbyFtcProjectRoots(visionLib, { adapter });
    expect(found).toContain(path.resolve(ftcRoot));
  });

  it("returns empty when no layout exists nearby", async () => {
    const parent = await makeTemp();
    const lonely = path.join(parent, "nested");
    await fs.mkdir(lonely, { recursive: true });
    await fs.writeFile(path.join(lonely, "package.json"), "{}\n");
    const found = await discoverNearbyFtcProjectRoots(lonely, { maxUpwardDepth: 0 });
    expect(found).toEqual([]);
  });
});
