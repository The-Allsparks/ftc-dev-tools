import type { Command } from "commander";
import { cleanProject } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerCleanCommand(program: Command): void {
  program
    .command("clean")
    .description("Run Gradle clean through the project Gradle Wrapper")
    .option("--verbose", "Show full Gradle output")
    .action(async (options: { verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const outcome = await cleanProject({
        adapter: ctx.adapter,
        runner: ctx.runner,
        logger: ctx.logger,
        cwd: ctx.cwd,
        verbose: options.verbose === true,
      });
      if (!outcome.result.success) {
        if (outcome.friendlyError) {
          await printFriendlyError(outcome.friendlyError, options.verbose === true);
        }
        process.exitCode = 1;
        return;
      }
      console.log(`Clean succeeded in ${(outcome.result.durationMs / 1000).toFixed(1)}s`);
    });
}
