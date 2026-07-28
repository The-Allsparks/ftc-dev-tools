import type { DoctorOptions } from "../doctor/run-doctor.js";
import type { ProcessRunner } from "../types/process.js";
import type { ProjectAdapter } from "../types/project.js";

/** Doctor options used by “Set Up This Computer” (no Wi-Fi / robot-interface checks). */
export function buildSetUpComputerDoctorOptions(
  cwd: string,
  runner: ProcessRunner,
  projectAdapter: ProjectAdapter,
): Pick<DoctorOptions, "cwd" | "runner" | "projectAdapter" | "checkWifi"> {
  return {
    cwd,
    runner,
    projectAdapter,
    checkWifi: false,
  };
}
