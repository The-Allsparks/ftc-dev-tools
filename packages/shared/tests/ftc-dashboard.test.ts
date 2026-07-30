import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import { buildFtcDashboardUrl } from "../src/vision/dashboard/constants.js";
import { detectFtcDashboardDependency } from "../src/vision/dashboard/detect-dependency.js";
import { resolveDashboardUrlReport } from "../src/vision/dashboard/resolve-url.js";
import { getFtcDashboardStatus } from "../src/vision/dashboard/status.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeMinimalFtcProject(root: string, deps = "dependencies {\n}\n"): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), deps);
}

describe("FTC Dashboard helpers", () => {
  it("builds default dashboard URL from host", () => {
    expect(buildFtcDashboardUrl("192.168.43.1")).toBe("http://192.168.43.1:8080/dash");
  });

  it("detects dashboard dependency version from Gradle", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-dash-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(
      root,
      "dependencies { implementation 'com.acmerobotics.dashboard:dashboard:0.6.1' }\n",
    );
    const info = await detectFtcDashboardDependency(root);
    expect(info.detected).toBe(true);
    expect(info.version).toBe("0.6.1");
  });

  it("uses vision.dashboard.url from project config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-dash-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { dashboard: { url: "http://10.9.16.2:8080/dash" } } }),
    );
    const report = await resolveDashboardUrlReport(root, { probeNetwork: false });
    expect(report.url).toBe("http://10.9.16.2:8080/dash");
    expect(report.requiresSelection).toBe(false);
  });

  it("reports dashboard status with mock fetch", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-dash-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(
      root,
      "dependencies { implementation 'com.acmerobotics.dashboard:dashboard:0.6.0' }\n",
    );
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { dashboard: { url: "http://robot.local:8080/dash" } } }),
    );

    const fetchImpl: FetchLike = async () =>
      ({
        ok: true,
        status: 200,
        text: async () => "<html>FTC Dashboard 0.6.0 telemetry</html>",
      }) as Response;

    const report = await getFtcDashboardStatus(root, {
      probeNetwork: true,
      fetchImpl,
    });

    expect(report.detected).toBe(true);
    expect(report.dependency?.version).toBe("0.6.0");
    expect(report.reachable).toBe("reachable");
    expect(report.detectedServerVersion).toBe("0.6.0");
    expect(report.warnings.some((warning) => /gamepad controls/i.test(warning))).toBe(true);
  });
});
