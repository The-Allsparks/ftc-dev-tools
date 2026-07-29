import type { Command } from "commander";
import {
  buildDoctorInstallPlan,
  buildDoctorSections,
  buildSetUpComputerDoctorOptions,
  formatDoctorCheckLine,
  runDoctor,
} from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check whether this computer is ready for FTC development")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .option(
      "--install-plan",
      "Print JSON for install-deps scope (computer checks only; use with --json or alone)",
    )
    .action(async (options: { json?: boolean; verbose?: boolean; installPlan?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }

      const doctorOpts = options.installPlan
        ? {
            ...buildSetUpComputerDoctorOptions(ctx.cwd, ctx.runner, ctx.adapter),
          }
        : {
            cwd: ctx.cwd,
            runner: ctx.runner,
            projectAdapter: ctx.adapter,
            deviceProvider,
          };

      const report = await runDoctor(doctorOpts);

      if (options.installPlan && !options.json) {
        const plan = buildDoctorInstallPlan(report.checks);
        console.log(JSON.stringify(plan, null, 2));
        process.exitCode = plan.needs.machineDepsSatisfied ? 0 : 1;
        return;
      }

      if (options.json) {
        const payload = options.installPlan
          ? { ...report, installPlan: buildDoctorInstallPlan(report.checks) }
          : report;
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log("FTC Development Check\n");
        const sections = buildDoctorSections(report);
        for (const section of sections) {
          console.log(`${section.title}`);
          console.log(`${"─".repeat(section.title.length)}`);
          for (const check of section.checks) {
            console.log(formatDoctorCheckLine(check));
            if ((check.status === "fail" || check.status === "warn") && check.friendlyError) {
              printFriendlyError(check.friendlyError, options.verbose === true);
            }
          }
          console.log("");
        }
        console.log(report.summaryLine);
        if (options.installPlan) {
          console.log("");
          console.log("Install plan:");
          console.log(JSON.stringify(buildDoctorInstallPlan(report.checks), null, 2));
        }
      }

      process.exitCode = report.ready ? 0 : 1;
    });
}
