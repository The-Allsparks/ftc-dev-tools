import type { DoctorCheck } from "../types/errors.js";
import {
  analyzeMachineInstallNeeds,
  buildInstallDepsOptionsFromNeeds,
  describeMachineInstallPlan,
  type MachineInstallNeeds,
} from "./install-needs-from-doctor.js";
import type { BuildInstallDepsOptions } from "../install-deps-urls.js";

export interface DoctorInstallPlan {
  needs: MachineInstallNeeds;
  installDepsOptions: BuildInstallDepsOptions;
  planLine: string;
}

export function buildDoctorInstallPlan(checks: readonly DoctorCheck[]): DoctorInstallPlan {
  const needs = analyzeMachineInstallNeeds(checks);
  return {
    needs,
    installDepsOptions: buildInstallDepsOptionsFromNeeds(needs),
    planLine: describeMachineInstallPlan(needs),
  };
}
