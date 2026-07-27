import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makeTemp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-project-"));
  tempDirs.push(dir);
  return dir;
}

describe("OfficialFtcProjectAdapter", () => {
  it("detects an official-like FTC layout", async () => {
    const root = await makeTemp();
    await fs.writeFile(
      path.join(root, "settings.gradle"),
      "include ':FtcRobotController', ':TeamCode'\n",
    );
    await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
    await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
    await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
    await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\n");
    await fs.writeFile(path.join(root, "gradlew"), "#!/bin/sh\n");

    const adapter = new OfficialFtcProjectAdapter();
    expect(await adapter.detect(root)).toBe(true);
    const info = await adapter.inspect(root);
    expect(info.kind).toBe("official-ftc");
    expect(info.moduleName).toBe("TeamCode");
  });

  it("rejects unrelated directories", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "README.md"), "hello\n");
    const adapter = new OfficialFtcProjectAdapter();
    expect(await adapter.detect(root)).toBe(false);
  });

  it("locates APK in common TeamCode output path", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(root, "build.common.gradle"), "//\n");
    await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
    await fs.mkdir(path.join(root, "TeamCode"), { recursive: true });
    await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\n");
    const apkDir = path.join(root, "TeamCode", "build", "outputs", "apk", "debug");
    await fs.mkdir(apkDir, { recursive: true });
    const apkPath = path.join(apkDir, "TeamCode-debug.apk");
    await fs.writeFile(apkPath, "fake");

    const adapter = new OfficialFtcProjectAdapter();
    const info = await adapter.inspect(root);
    await expect(adapter.locateApk(info)).resolves.toBe(apkPath);
  });
});
