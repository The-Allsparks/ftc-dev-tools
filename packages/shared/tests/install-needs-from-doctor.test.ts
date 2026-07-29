import { describe, expect, it } from "vitest";
import {
  analyzeMachineInstallNeeds,
  buildInstallDepsOptionsFromNeeds,
  describeMachineInstallPlan,
} from "../src/setup/install-needs-from-doctor.js";
import type { DoctorCheck } from "../src/types/errors.js";

function check(id: string, status: DoctorCheck["status"]): DoctorCheck {
  return { id, label: id, status, required: true };
}

describe("install-needs-from-doctor", () => {
  it("installs only JDK when SDK checks pass", () => {
    const needs = analyzeMachineInstallNeeds([
      check("java", "fail"),
      check("android-sdk", "pass"),
      check("adb", "pass"),
    ]);
    expect(buildInstallDepsOptionsFromNeeds(needs)).toEqual({ skipJdk: false, skipSdk: true });
    expect(describeMachineInstallPlan(needs)).toContain("JDK");
    expect(describeMachineInstallPlan(needs)).not.toContain("Android SDK / adb");
  });

  it("reports satisfied when machine checks pass", () => {
    const needs = analyzeMachineInstallNeeds([
      check("java", "pass"),
      check("android-sdk", "pass"),
      check("adb", "pass"),
    ]);
    expect(needs.machineDepsSatisfied).toBe(true);
    expect(needs.needsJdk).toBe(false);
  });
});
