import { describe, expect, it } from "vitest";
import {
  buildDoctorCheckUiItem,
  listActionableDoctorChecks,
  resolveDoctorSuccessNextStep,
} from "../src/doctor/doctor-fix-actions.js";
import type { DoctorCheck, DoctorReport } from "../src/types/errors.js";

function check(
  id: string,
  status: DoctorCheck["status"],
  friendlyError?: DoctorCheck["friendlyError"],
): DoctorCheck {
  return {
    id,
    label: id,
    status,
    required: status === "fail",
    friendlyError,
  };
}

describe("buildDoctorCheckUiItem", () => {
  it("returns undefined for passing checks", () => {
    expect(buildDoctorCheckUiItem(check("java", "pass"))).toBeUndefined();
  });

  it("maps Java failures to install-deps terminal action on Windows", () => {
    const item = buildDoctorCheckUiItem(
      check("java", "fail", {
        code: "INCOMPATIBLE_JAVA",
        title: "Java",
        summary: "Need JDK 17",
        suggestedActions: [],
      }),
      "win32",
    );
    expect(item?.primaryAction?.id).toBe("install-deps");
    expect(item?.primaryAction?.kind).toBe("terminal");
    expect(item?.primaryAction?.terminalCommand).toMatch(/install-deps-windows/);
  });

  it("maps wrong-folder project checks to select project root", () => {
    const item = buildDoctorCheckUiItem(
      check("ftc-project", "fail", {
        code: "UNSUPPORTED_PROJECT_LAYOUT",
        title: "Not in an FTC project folder",
        summary: "Open settings.gradle root",
        suggestedActions: [],
      }),
    );
    expect(item?.primaryAction?.command).toBe("ftc.selectProjectRoot");
  });

  it("maps device warnings to show devices", () => {
    const item = buildDoctorCheckUiItem(
      check("devices", "warn", {
        code: "NO_DEVICES",
        title: "No devices",
        summary: "Plug in USB",
        suggestedActions: [],
      }),
    );
    expect(item?.primaryAction?.command).toBe("ftc.showDevices");
  });

  it("maps wifi robot interface warn without friendlyError", () => {
    const item = buildDoctorCheckUiItem({
      id: "wifi-robot-interface",
      label: "Robot network interface selected",
      status: "warn",
      required: false,
      detail: "No robot NIC selected.",
    });
    expect(item?.primaryAction?.command).toBe("ftc.wifiSelectInterface");
  });
});

describe("listActionableDoctorChecks", () => {
  it("collects only fail and warn checks", () => {
    const report: DoctorReport = {
      ready: false,
      readiness: {
        computerReady: false,
        projectReadyToBuild: true,
        robotReadyToDeploy: true,
      },
      checks: [check("java", "fail"), check("adb", "pass"), check("devices", "warn")],
      sections: {
        machine: { id: "machine", title: "Machine", ready: false, checks: [] },
        project: { id: "project", title: "Project", ready: true, checks: [] },
      },
      summaryLine: "Not ready",
      generatedAt: "",
      version: "0.0.0",
    };
    const items = listActionableDoctorChecks(report);
    expect(items.map((i) => i.checkId).sort()).toEqual(["devices", "java"]);
  });
});

describe("resolveDoctorSuccessNextStep", () => {
  it("suggests build when fully ready", () => {
    const report: DoctorReport = {
      ready: true,
      readiness: {
        computerReady: true,
        projectReadyToBuild: true,
        robotReadyToDeploy: true,
      },
      checks: [],
      sections: {
        machine: { id: "machine", title: "Machine", ready: true, checks: [] },
        project: { id: "project", title: "Project", ready: true, checks: [] },
      },
      summaryLine: "Ready",
      generatedAt: "",
      version: "0.0.0",
    };
    expect(resolveDoctorSuccessNextStep(report)?.command).toBe("ftc.build");
  });
});
