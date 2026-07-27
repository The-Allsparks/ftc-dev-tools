import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findGradleWrapper, buildGradleCommand } from "../src/gradle/wrapper.js";
import { gradleWrapperName } from "../src/paths/os-paths.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("Gradle Wrapper detection", () => {
  it("finds platform wrapper name", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-gradle-"));
    tempDirs.push(dir);
    const name = gradleWrapperName("win32");
    expect(name).toBe("gradlew.bat");
    await fs.writeFile(path.join(dir, "gradlew.bat"), "@echo off\n");
    await fs.mkdir(path.join(dir, "gradle", "wrapper"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "gradle", "wrapper", "gradle-wrapper.properties"),
      "distributionUrl=x\n",
    );
    const info = await findGradleWrapper(dir, "win32");
    expect(info.found).toBe(true);
    expect(info.wrapperPath?.endsWith("gradlew.bat")).toBe(true);
  });

  it("constructs command args without a shell string", () => {
    const spec = buildGradleCommand(
      "C:\\\\proj\\\\gradlew.bat",
      [":TeamCode:assembleDebug"],
      "C:\\\\proj",
    );
    expect(spec.args).toEqual([":TeamCode:assembleDebug"]);
    expect(spec.cwd).toBe("C:\\\\proj");
  });
});
