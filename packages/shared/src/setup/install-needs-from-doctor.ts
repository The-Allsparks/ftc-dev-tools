import type { DoctorCheck } from "../types/errors.js";
import type { BuildInstallDepsOptions } from "../install-deps-urls.js";

export interface MachineInstallNeeds {
  needsJdk: boolean;
  needsAndroidSdk: boolean;
  machineDepsSatisfied: boolean;
  jdkDetail?: string;
  sdkDetail?: string;
}

function checkById(checks: readonly DoctorCheck[], id: string): DoctorCheck | undefined {
  return checks.find((c) => c.id === id);
}

function needsAttention(check: DoctorCheck | undefined): boolean {
  if (!check) {
    return true;
  }
  return check.status === "fail" || check.status === "warn";
}

/** Maps doctor computer checks to install-deps skip flags (install only what's missing). */
export function analyzeMachineInstallNeeds(checks: readonly DoctorCheck[]): MachineInstallNeeds {
  const java = checkById(checks, "java");
  const androidSdk = checkById(checks, "android-sdk");
  const adb = checkById(checks, "adb");

  const needsJdk = needsAttention(java);
  const needsAndroidSdk = needsAttention(androidSdk) || needsAttention(adb);

  return {
    needsJdk,
    needsAndroidSdk,
    machineDepsSatisfied: !needsJdk && !needsAndroidSdk,
    jdkDetail: java?.detail ?? java?.friendlyError?.summary,
    sdkDetail:
      androidSdk?.friendlyError?.summary ??
      adb?.friendlyError?.summary ??
      androidSdk?.detail ??
      adb?.detail,
  };
}

export function buildInstallDepsOptionsFromNeeds(
  needs: MachineInstallNeeds,
): BuildInstallDepsOptions {
  return {
    skipJdk: !needs.needsJdk,
    skipSdk: !needs.needsAndroidSdk,
  };
}

export function describeMachineInstallPlan(needs: MachineInstallNeeds): string {
  if (needs.machineDepsSatisfied) {
    return "Doctor: Java, Android SDK, and adb look good — nothing to install.";
  }
  const parts: string[] = [];
  if (needs.needsJdk) {
    parts.push("JDK");
  }
  if (needs.needsAndroidSdk) {
    parts.push("Android SDK / adb");
  }
  return `Doctor will install: ${parts.join(" and ")}.`;
}
