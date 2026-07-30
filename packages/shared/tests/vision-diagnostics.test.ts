import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildVisionDoctorChecks } from "../src/vision/diagnostics/doctor.js";
import { collectVisionDiagnostics } from "../src/vision/diagnostics/collect.js";
import { VISION_DIAGNOSTIC_CODES } from "../src/vision/diagnostics/codes.js";
import { visionDiagnosticToFriendlyError } from "../src/vision/diagnostics/friendly.js";
import { interpretError } from "../src/errors/interpret.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeMinimalFtcProject(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("vision diagnostics", () => {
  it("reports unsupported project layout", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vdiag-"));
    tempDirs.push(root);

    const report = await collectVisionDiagnostics(root, { probeNetwork: false });
    expect(
      report.diagnostics.some((d) => d.code === VISION_DIAGNOSTIC_CODES.VISION_PROJECT_UNSUPPORTED),
    ).toBe(true);
    expect(report.summary.errorCount).toBeGreaterThan(0);
  });

  it("warns when no vision libraries are detected", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vdiag-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const report = await collectVisionDiagnostics(root, { probeNetwork: false });
    expect(
      report.diagnostics.some((d) => d.code === VISION_DIAGNOSTIC_CODES.VISION_NO_LIBRARIES),
    ).toBe(true);
  });

  it("warns on default provider mismatch", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vdiag-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(
        root,
        "TeamCode",
        "src",
        "main",
        "java",
        "org",
        "firstinsparks",
        "teamcode",
        "VisionTest.java",
      ),
      "import org.firstinspires.ftc.vision.VisionPortal;\npublic class VisionTest {}\n",
    );
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { defaultProviderId: "vision:limelight" } }),
    );

    const report = await collectVisionDiagnostics(root, { probeNetwork: false });
    expect(
      report.diagnostics.some(
        (d) => d.code === VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH,
      ),
    ).toBe(true);
  });

  it("maps diagnostics to friendly errors and interpret rules", () => {
    const friendly = visionDiagnosticToFriendlyError({
      code: VISION_DIAGNOSTIC_CODES.VISION_NO_LIBRARIES,
      severity: "warn",
      confidence: "certain",
      title: "No vision libraries detected",
      summary: "Nothing found.",
      evidence: ["No signals"],
      suggestedActions: ["Add a library."],
    });
    expect(friendly.code).toBe("VISION_NO_LIBRARIES");
    expect(friendly.suggestedActions.length).toBeGreaterThan(0);

    const interpreted = interpretError({ text: "", codeHint: "VISION_NO_LIBRARIES" });
    expect(interpreted.code).toBe("VISION_NO_LIBRARIES");
  });

  it("adds optional vision doctor checks without affecting required checks", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vdiag-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const { checks } = await buildVisionDoctorChecks(root, {
      projectPass: true,
      probeNetwork: false,
    });
    expect(checks).toHaveLength(3);
    expect(checks.every((check) => check.required === false)).toBe(true);
    expect(checks.map((check) => check.id)).toEqual([
      "vision-workspace",
      "vision-network",
      "vision-artifacts",
    ]);
    expect(checks.find((check) => check.id === "vision-network")?.status).toBe("skip");
  });
});
