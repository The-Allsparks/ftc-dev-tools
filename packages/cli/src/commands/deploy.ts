import type { Command } from "commander";
import { deployProject, interpretFromUnknown } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerDeployCommand(program: Command): void {
  program
    .command("deploy")
    .description("Build and deploy the robot application to a connected Android device")
    .option("--device <serial>", "Target device serial")
    .option("--dry-run", "Print operations without changing the device")
    .option("--verbose", "Show full technical output")
    .option("--report", "File a GitHub error report if deploy fails")
    .action(
      async (options: {
        device?: string;
        dryRun?: boolean;
        verbose?: boolean;
        report?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        try {
          const devices = await ctx.createDeviceProvider();
          const outcome = await deployProject({
            adapter: ctx.adapter,
            runner: ctx.runner,
            devices,
            logger: ctx.logger,
            cwd: ctx.cwd,
            deviceSerial: options.device,
            dryRun: options.dryRun === true,
            verbose: options.verbose === true,
          });

          for (const step of outcome.result.steps) {
            console.log(`- ${step}`);
          }
          console.log(outcome.result.message);
          console.log(`Elapsed: ${(outcome.result.durationMs / 1000).toFixed(1)}s`);

          if (!outcome.result.success) {
            if (outcome.friendlyError) {
              await printFriendlyError(outcome.friendlyError, options.verbose === true, {
                commandAttempted: "ftc.deploy",
                deploySteps: outcome.result.steps,
                forceReport: options.report === true,
              });
            }
            process.exitCode = 1;
          }
        } catch (error) {
          await printFriendlyError(interpretFromUnknown(error), options.verbose === true, {
            commandAttempted: "ftc.deploy",
            forceReport: options.report === true,
          });
          process.exitCode = 1;
        }
      },
    );
}
