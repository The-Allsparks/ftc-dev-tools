import type { Command } from "commander";
import {
  listRobotConfigs,
  pullRobotConfigs,
  showRobotConfig,
  validateRobotConfig,
} from "@ftc-dev-tools/shared";
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

export function registerConfigCommand(program: Command): void {
  const config = program
    .command("config")
    .description("List, show, validate, and pull FTC robot configuration XML");

  config
    .command("list")
    .description("List robot config XML under TeamCode/src/main/res/xml")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const report = await listRobotConfigs(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("Robot configs\n");
        console.log(report.message);
        for (const item of report.configs) {
          console.log(`  - ${item.name} (${item.deviceCount} named entries)`);
          console.log(`    ${item.relativePath}`);
        }
        if (report.error) {
          printFriendlyError(report.error, options.verbose === true);
        }
      }
      process.exitCode = report.error ? 1 : 0;
    });

  config
    .command("show")
    .description("Show devices/modules from a robot config XML")
    .argument("<name-or-path>", "Config base name or path under the project")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (nameOrPath: string, options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const result = await showRobotConfig(ctx.cwd, nameOrPath);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
        if (result.config) {
          if (result.config.rootType) {
            console.log(`Root type: ${result.config.rootType}`);
          }
          console.log(`Path: ${result.config.relativePath}`);
          for (const device of result.config.devices) {
            const port = device.port ? ` port=${device.port}` : "";
            console.log(`  - ${device.name} (${device.type}${port})`);
          }
        }
        if (result.error) {
          printFriendlyError(result.error, options.verbose === true);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });

  config
    .command("validate")
    .description("Validate a robot config XML (names, duplicates, Robot root)")
    .argument("<name-or-path>", "Config base name or path under the project")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (nameOrPath: string, options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      const result = await validateRobotConfig(ctx.cwd, nameOrPath);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
        for (const issue of result.issues) {
          console.log(`  [${issue.severity}] ${issue.message}`);
        }
        if (result.error) {
          printFriendlyError(result.error, options.verbose === true);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });

  config
    .command("pull")
    .description("Pull robot config XML from /sdcard/FIRST on a connected device into TeamCode res/xml")
    .option("--device <serial>", "Target device serial")
    .option("--name <file>", "Pull a single remote XML file name")
    .option("--dry-run", "List remote files without copying")
    .option("--yes", "Pull without an interactive confirmation prompt")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        device?: string;
        name?: string;
        dryRun?: boolean;
        yes?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        let deviceProvider;
        try {
          deviceProvider = await ctx.createDeviceProvider();
        } catch {
          deviceProvider = undefined;
        }

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          const preview = await pullRobotConfigs({
            projectRoot: ctx.cwd,
            runner: ctx.runner,
            deviceProvider,
            deviceSerial: options.device,
            remoteName: options.name,
            dryRun: true,
          });
          console.log(preview.message);
          for (const file of preview.plannedFiles) {
            console.log(`  - ${file}`);
          }
          if (!preview.success) {
            if (preview.error) {
              printFriendlyError(preview.error, options.verbose === true);
            }
            process.exitCode = 1;
            return;
          }
          const ok = await confirm("Pull these robot configs into TeamCode/src/main/res/xml?");
          if (!ok) {
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await pullRobotConfigs({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          deviceProvider,
          deviceSerial: options.device,
          remoteName: options.name,
          dryRun: options.dryRun === true,
          yes: options.yes === true || options.dryRun === true,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          for (const file of result.pulledFiles.length > 0 ? result.pulledFiles : result.plannedFiles) {
            console.log(`  - ${file}`);
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}
