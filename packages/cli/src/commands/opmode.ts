import type { Command } from "commander";
import { createOpMode, listOpModes } from "@ftc-dev-tools/shared";
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

export function registerOpModeCommand(program: Command): void {
  const opmode = program
    .command("opmode")
    .description("List and create FTC OpModes under TeamCode");

  opmode
    .command("list")
    .description("List @TeleOp / @Autonomous classes under TeamCode")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const report = await listOpModes(ctx.cwd, { adapter: ctx.adapter });
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("OpModes\n");
        console.log(report.message);
        for (const item of report.opmodes) {
          const kind = item.kind ?? "unknown";
          const group = item.group ? ` · group ${item.group}` : "";
          console.log(`  - ${item.className} (${kind}${group})`);
          console.log(`    ${item.relativePath}`);
        }
        if (report.error) {
          await printFriendlyError(report.error, options.verbose === true);
        }
      }
      process.exitCode = report.error ? 1 : 0;
    });

  opmode
    .command("create")
    .description("Create a new TeleOp or Autonomous OpMode under TeamCode")
    .argument("<class-name>", "Java class name (e.g. MyTeleOp)")
    .requiredOption("--type <teleop|autonomous>", "OpMode type")
    .option("--linear", "Extend LinearOpMode (default)", true)
    .option("--iterative", "Extend iterative OpMode instead of LinearOpMode")
    .option("--group <name>", "Driver Station group")
    .option("--name <display>", "Driver Station display name (defaults to class name)")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode)")
    .option("--dry-run", "Show the target path without writing")
    .option("--yes", "Create without an interactive confirmation prompt")
    .option("--force", "Overwrite existing file and/or allow dirty git tree")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        className: string,
        options: {
          type: string;
          linear?: boolean;
          iterative?: boolean;
          group?: string;
          name?: string;
          package?: string;
          dryRun?: boolean;
          yes?: boolean;
          force?: boolean;
          json?: boolean;
          verbose?: boolean;
        },
      ) => {
        const kind = options.type.toLowerCase();
        if (kind !== "teleop" && kind !== "autonomous") {
          console.error(`--type must be teleop or autonomous (got ${options.type})`);
          process.exitCode = 1;
          return;
        }

        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const style = options.iterative ? "iterative" : "linear";

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          const preview = await createOpMode({
            projectRoot: ctx.cwd,
            runner: ctx.runner,
            adapter: ctx.adapter,
            className,
            kind,
            style,
            group: options.group,
            name: options.name,
            packageName: options.package,
            dryRun: true,
            force: options.force === true,
          });
          console.log(preview.message);
          const ok = await confirm(`Create OpMode ${className}?`);
          if (!ok) {
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await createOpMode({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          adapter: ctx.adapter,
          className,
          kind,
          style,
          group: options.group,
          name: options.name,
          packageName: options.package,
          dryRun: options.dryRun === true,
          yes: options.yes === true || options.dryRun === true,
          force: options.force === true,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.relativePath) {
            console.log(`Path: ${result.relativePath}`);
          }
          if (result.backupDirectory) {
            console.log(`Backup: ${result.backupDirectory}`);
          }
          if (result.error) {
            await printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}
