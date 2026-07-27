import type { Command } from "commander";
import { codegenHardwareMapOpMode, showHardwareMap } from "@ftc-dev-tools/shared";
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

export function registerHwMapCommand(program: Command): void {
  const hwmap = program
    .command("hwmap")
    .description("Inspect robot config as a hardware map and generate OpMode stubs");

  hwmap
    .command("show")
    .description("Show name → type mapping from a robot config XML")
    .option("--config <name>", "Robot config base name (required if multiple configs)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { config?: string; json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const report = await showHardwareMap(ctx.cwd, options.config);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("Hardware map\n");
        console.log(report.message);
        if (report.configPath) {
          console.log(`Config: ${report.configPath}`);
        }
        for (const entry of report.entries) {
          const type = entry.javaType ?? "(unmapped)";
          const port = entry.port ? ` port=${entry.port}` : "";
          const flag = entry.includedInCodegen ? "" : " [skip codegen]";
          console.log(`  - ${entry.configName} → ${type} (${entry.xmlType}${port})${flag}`);
        }
        if (report.error) {
          printFriendlyError(report.error, options.verbose === true);
        }
      }
      process.exitCode = report.success ? 0 : 1;
    });

  hwmap
    .command("codegen")
    .description("Generate a new OpMode with hardwareMap.get stubs from a robot config")
    .argument("<class-name>", "Java class name for the new OpMode")
    .option("--config <name>", "Robot config base name (required if multiple configs)")
    .option("--type <teleop|autonomous>", "OpMode type", "teleop")
    .option("--linear", "Extend LinearOpMode (default)", true)
    .option("--iterative", "Extend iterative OpMode instead of LinearOpMode")
    .option("--group <name>", "Driver Station group")
    .option("--name <display>", "Driver Station display name (defaults to class name)")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode)")
    .option("--dry-run", "Show the target path and preview without writing")
    .option("--yes", "Create without an interactive confirmation prompt")
    .option("--force", "Overwrite existing file and/or allow dirty git tree")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        className: string,
        options: {
          config?: string;
          type?: string;
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
        const kind = (options.type ?? "teleop").toLowerCase();
        if (kind !== "teleop" && kind !== "autonomous") {
          console.error(`--type must be teleop or autonomous (got ${options.type})`);
          process.exitCode = 1;
          return;
        }

        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const style = options.iterative ? "iterative" : "linear";

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          const preview = await codegenHardwareMapOpMode({
            projectRoot: ctx.cwd,
            runner: ctx.runner,
            configName: options.config,
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
          if (preview.sourcePreview && !options.json) {
            console.log("\n--- preview ---\n");
            console.log(preview.sourcePreview);
          }
          if (!preview.success) {
            if (preview.error) {
              printFriendlyError(preview.error, options.verbose === true);
            }
            process.exitCode = 1;
            return;
          }
          const ok = await confirm(`Generate OpMode ${className} from config?`);
          if (!ok) {
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await codegenHardwareMapOpMode({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          configName: options.config,
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
          if (result.dryRun && result.sourcePreview) {
            console.log("\n--- preview ---\n");
            console.log(result.sourcePreview);
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}
