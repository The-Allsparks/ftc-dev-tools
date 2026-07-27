import type { Command } from "commander";
import { runDoctor } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check whether this computer is ready for FTC development")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }

      const report = await runDoctor({
        cwd: ctx.cwd,
        runner: ctx.runner,
        projectAdapter: ctx.adapter,
        deviceProvider,
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("FTC Development Check\n");
        for (const check of report.checks) {
          const mark =
            check.status === "pass"
              ? "✓"
              : check.status === "warn"
                ? "!"
                : check.status === "skip"
                  ? "-"
                  : "✗";
          const detail = check.detail ? ` (${check.detail})` : "";
          console.log(`${mark} ${check.label}${detail}`);
          if (check.status === "fail" && check.friendlyError) {
            printFriendlyError(check.friendlyError, options.verbose === true);
          }
        }
        console.log(`\n${report.summaryLine}`);
      }

      process.exitCode = report.ready ? 0 : 1;
    });
}
