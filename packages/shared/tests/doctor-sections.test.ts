import { describe, expect, it } from "vitest";
import {
  buildDoctorSections,
  categoryForCheckId,
  partitionChecksBySection,
} from "../src/doctor/doctor-sections.js";
import type { DoctorCheck, DoctorReadiness } from "../src/types/errors.js";

function check(id: string, status: DoctorCheck["status"] = "pass"): DoctorCheck {
  return {
    id,
    label: id,
    status,
    required: id === "java",
    category: categoryForCheckId(id),
  };
}

describe("doctor sections", () => {
  it("maps known check ids to machine, project, robot, and other", () => {
    expect(categoryForCheckId("java")).toBe("machine");
    expect(categoryForCheckId("ftc-project")).toBe("project");
    expect(categoryForCheckId("devices")).toBe("robot");
    expect(categoryForCheckId("ftc-sdk-version")).toBe("other");
    expect(categoryForCheckId("unknown-check")).toBe("other");
  });

  it("partitions checks into section buckets", () => {
    const checks = [check("os"), check("ftc-project"), check("devices"), check("ftc-sdk-version")];
    const parts = partitionChecksBySection(checks);
    expect(parts.machine.map((c) => c.id)).toEqual(["os"]);
    expect(parts.project.map((c) => c.id)).toEqual(["ftc-project"]);
    expect(parts.robot.map((c) => c.id)).toEqual(["devices"]);
    expect(parts.other.map((c) => c.id)).toEqual(["ftc-sdk-version"]);
  });

  it("builds section summaries aligned with readiness flags", () => {
    const checks: DoctorCheck[] = [
      check("java", "fail"),
      check("ftc-project", "pass"),
      check("gradle-wrapper", "pass"),
    ];
    const readiness: DoctorReadiness = {
      computerReady: false,
      projectReadyToBuild: true,
      robotReadyToDeploy: true,
    };
    const sections = buildDoctorSections({ checks, readiness });
    const machine = sections.find((s) => s.id === "machine");
    const project = sections.find((s) => s.id === "project");
    expect(machine?.ready).toBe(false);
    expect(project?.ready).toBe(true);
  });
});
