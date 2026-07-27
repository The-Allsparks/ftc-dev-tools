import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectLocalSdk, parseFtcMavenArtifacts } from "../src/sdk/detect-local-sdk.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makeTemp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-sdk-detect-"));
  tempDirs.push(dir);
  return dir;
}

describe("detectLocalSdk", () => {
  it("parses consistent Maven coordinates", async () => {
    const root = await makeTemp();
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      `
dependencies {
  implementation 'org.firstinspires.ftc:RobotCore:11.1.0'
  implementation 'org.firstinspires.ftc:FtcCommon:11.1.0'
  implementation 'org.firstinspires.ftc:Hardware:11.1.0'
}
`,
    );
    await fs.mkdir(path.join(root, "FtcRobotController", "src", "main"), { recursive: true });
    await fs.writeFile(
      path.join(root, "FtcRobotController", "src", "main", "AndroidManifest.xml"),
      `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    android:versionCode="51"
    android:versionName="11.1"
    package="com.qualcomm.ftcrobotcontroller">
</manifest>
`,
    );

    const info = await detectLocalSdk(root);
    expect(info.version).toBe("11.1.0");
    expect(info.mismatchedVersions).toBe(false);
    expect(info.artifacts).toHaveLength(3);
    expect(info.manifestVersionName).toBe("11.1");
    expect(info.manifestVersionCode).toBe("51");
  });

  it("flags mismatched artifact versions", async () => {
    const root = await makeTemp();
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      `
implementation 'org.firstinspires.ftc:RobotCore:11.1.0'
implementation 'org.firstinspires.ftc:FtcCommon:11.2.0'
`,
    );
    const info = await detectLocalSdk(root);
    expect(info.mismatchedVersions).toBe(true);
    expect(info.version).toBe("11.1.0");
  });

  it("handles missing deps file", async () => {
    const root = await makeTemp();
    const info = await detectLocalSdk(root);
    expect(info.version).toBeUndefined();
    expect(info.artifacts).toEqual([]);
  });

  it("parseFtcMavenArtifacts reads quoted coords", () => {
    const arts = parseFtcMavenArtifacts(
      `implementation "org.firstinspires.ftc:Vision:10.3.0"\napi 'org.firstinspires.ftc:Blocks:10.3.0'`,
    );
    expect(arts).toEqual([
      { name: "Vision", version: "10.3.0" },
      { name: "Blocks", version: "10.3.0" },
    ]);
  });
});
