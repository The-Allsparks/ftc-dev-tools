import type { Command } from "commander";
import { buildProject } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("Build the FTC robot application using the project Gradle Wrapper")
    .option("--verbose", "Show full Gradle output")
    .option("--report", "File a GitHub error report if the build fails")
    .action(async (options: { verbose?: boolean; report?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const outcome = await buildProject({
        adapter: ctx.adapter,
        runner: ctx.runner,
        logger: ctx.logger,
        cwd: ctx.cwd,
        verbose: options.verbose === true,
      });

      if (!outcome.result.success) {
        if (outcome.friendlyError) {
          await printFriendlyError(outcome.friendlyError, options.verbose === true, {
            commandAttempted: "ftc.build",
            forceReport: options.report === true,
          });
        }
        if (options.verbose) {
          process.stderr.write(outcome.result.stdout);
          process.stderr.write(outcome.result.stderr);
        }
        process.exitCode = 1;
        return;
      }

      console.log(`Build succeeded in ${(outcome.result.durationMs / 1000).toFixed(1)}s`);
      console.log(`APK: ${outcome.result.apkPath}`);
    });
}
