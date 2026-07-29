import { describe, expect, it } from "vitest";
import { buildReadinessSnapshotFromDoctor } from "../src/readiness/readiness-model.js";
import type { DoctorCheck, DoctorReadiness } from "../src/types/errors.js";

function report(checks: DoctorCheck[], readiness: DoctorReadiness) {
  return buildReadinessSnapshotFromDoctor({ checks, readiness });
}

describe("readiness model (#82)", () => {
  it("treats skipped device check as unknown deploy readiness", () => {
    const checks: DoctorCheck[] = [
      { id: "java", label: "Java", status: "pass", required: true },
      { id: "ftc-project", label: "Project", status: "pass", required: true },
      {
        id: "devices",
        label: "Devices",
        status: "skip",
        required: false,
        detail: "No device provider",
      },
    ];
    const snapshot = report(checks, {
      computerReady: true,
      projectReadyToBuild: true,
      robotReadyToDeploy: true,
    });
    expect(snapshot.categories.find((c) => c.id === "device")?.level).toBe("unknown");
    expect(snapshot.deployReady).toBe(false);
  });

  it("marks deploy ready only with authorized device pass", () => {
    const checks: DoctorCheck[] = [
      { id: "adb", label: "adb", status: "pass", required: true },
      { id: "ftc-project", label: "Project", status: "pass", required: true },
      {
        id: "devices",
        label: "Devices",
        status: "pass",
        required: false,
        detail: "ABC123 authorized",
      },
    ];
    const snapshot = report(checks, {
      computerReady: true,
      projectReadyToBuild: true,
      robotReadyToDeploy: true,
    });
    expect(snapshot.deployReady).toBe(true);
  });

  it("does not treat device enumeration failure as pass", () => {
    const checks: DoctorCheck[] = [
      { id: "ftc-project", label: "Project", status: "pass", required: true },
      { id: "devices", label: "Devices", status: "fail", required: false },
    ];
    const snapshot = report(checks, {
      computerReady: true,
      projectReadyToBuild: true,
      robotReadyToDeploy: false,
    });
    expect(snapshot.categories.find((c) => c.id === "device")?.level).toBe("fail");
    expect(snapshot.deployReady).toBe(false);
  });

  it("requires build snapshot for competition ready", () => {
    const checks: DoctorCheck[] = [
      { id: "adb", label: "adb", status: "pass", required: true },
      { id: "ftc-project", label: "Project", status: "pass", required: true },
      { id: "devices", label: "Devices", status: "pass", required: false },
    ];
    const allMilestones = [
      "doctor-ok",
      "device-authorized",
      "build-ok",
      "deploy-ok",
      "opmode-on-driver-station",
      "teamcode-logs",
    ] as const;
    const withoutBuild = buildReadinessSnapshotFromDoctor(
      {
        checks,
        readiness: { computerReady: true, projectReadyToBuild: true, robotReadyToDeploy: true },
      },
      { milestoneCompleted: [...allMilestones] },
    );
    expect(withoutBuild.competitionReady).toBe(false);

    const withBuild = buildReadinessSnapshotFromDoctor(
      {
        checks,
        readiness: { computerReady: true, projectReadyToBuild: true, robotReadyToDeploy: true },
      },
      {
        milestoneCompleted: [...allMilestones],
        lastSuccessfulBuild: { completedAt: "2026-07-29T00:00:00.000Z", apkPath: "/tmp/app.apk" },
      },
    );
    expect(withBuild.competitionReady).toBe(true);
  });
});
