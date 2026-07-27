import type { Command } from "commander";
import { addPedroPathing, detectPedroStatus, scaffoldPedroPathing } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

async function confirm(question: string): Promise<boolean> {
  process.stdout.write(`${question} [y/N] `);
  return await new Promise((resolve) => {
    const onData = (chunk: Buffer): void => {
      process.stdin.off("data", onData);
      process.stdin.pause();
      const answer = chunk.toString("utf8").trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    };
    process.stdin.resume();
    process.stdin.once("data", onData);
  });
}

export function registerPedroCommand(program: Command): void {
  const pedro = program
    .command("pedro")
    .description("Detect, add, and scaffold Pedro Pathing in an official FTC project");

  pedro
    .command("status")
    .description("Show Pedro Pathing dependency and package status")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const report = await detectPedroStatus(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("Pedro Pathing Status\n");
        console.log(report.message);
        console.log(`FTC artifact: ${report.ftcVersion ?? "(missing)"}`);
        console.log(`Byalazar repo: ${report.byalazarRepoPresent ? "yes" : "no"}`);
        console.log(
          `Package: ${report.pedroPathingPackagePresent ? report.pedroPathingPackagePath : "(missing)"}`,
        );
        console.log(
          `compileSdk: ${report.compileSdk ?? "(unknown)"}${report.compileSdkOk ? "" : " (below recommended 34)"}`,
        );
        for (const warning of report.warnings) {
          console.log(`Warning: ${warning}`);
        }
        if (report.error) {
          printFriendlyError(report.error, options.verbose === true);
        }
      }
      process.exitCode = report.error ? 1 : 0;
    });

  pedro
    .command("add")
    .description("Add Pedro Pathing Maven repo + dependencies to build.dependencies.gradle")
    .option(
      "--version <ver>",
      "Pin com.pedropathing:ftc version (default: latest stable from Maven Central)",
    )
    .option("--no-patch-compile-sdk", "Do not bump compileSdk to 34")
    .option("--dry-run", "Show planned gradle changes without writing")
    .option("--yes", "Apply without an interactive confirmation prompt")
    .option("--force", "Allow when the git working tree is dirty")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        version?: string;
        patchCompileSdk?: boolean;
        dryRun?: boolean;
        yes?: boolean;
        force?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          const preview = await addPedroPathing({
            projectRoot: ctx.cwd,
            runner: ctx.runner,
            version: options.version,
            patchCompileSdk: options.patchCompileSdk !== false,
            dryRun: true,
          });
          console.log(preview.message);
          for (const entry of preview.plan) {
            console.log(`  - ${entry.description}`);
          }
          const ok = await confirm("Continue adding Pedro Pathing dependencies?");
          if (!ok) {
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await addPedroPathing({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          version: options.version,
          patchCompileSdk: options.patchCompileSdk !== false,
          dryRun: options.dryRun === true,
          yes: options.yes === true || options.dryRun === true,
          force: options.force === true,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.plan.length > 0) {
            console.log("\nPlan:");
            for (const entry of result.plan) {
              console.log(`  - ${entry.description}`);
            }
          }
          if (result.backupDirectory) {
            console.log(`Backup: ${result.backupDirectory}`);
          }
          for (const warning of result.warnings) {
            console.log(`Warning: ${warning}`);
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  pedro
    .command("scaffold")
    .description(
      "Copy TeamCode/**/pedroPathing/** from the Pedro Quickstart (never unrelated TeamCode)",
    )
    .option("--tag <tag>", "Quickstart release tag (default: latest)")
    .option("--dry-run", "Show planned file copies without writing")
    .option("--yes", "Apply without an interactive confirmation prompt")
    .option("--force", "Allow when the git working tree is dirty")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        tag?: string;
        dryRun?: boolean;
        yes?: boolean;
        force?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          const ok = await confirm(
            "Copy pedroPathing package files from Pedro Quickstart into TeamCode?",
          );
          if (!ok) {
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await scaffoldPedroPathing({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          tag: options.tag,
          dryRun: options.dryRun === true,
          yes: options.yes === true || options.dryRun === true,
          force: options.force === true,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.sourceTag) {
            console.log(`Quickstart: ${result.sourceTag}`);
          }
          if (result.plan.length > 0 && options.verbose) {
            console.log("\nPlan:");
            for (const entry of result.plan) {
              console.log(`  - ${entry.action}: ${entry.relativePath}`);
            }
          }
          if (result.backupDirectory) {
            console.log(`Backup: ${result.backupDirectory}`);
          }
          for (const warning of result.warnings) {
            console.log(`Warning: ${warning}`);
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}
