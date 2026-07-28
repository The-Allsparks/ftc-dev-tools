import type { Command } from "commander";
import {
  applySdkUpdate,
  checkSdkStatus,
  listSdkBackups,
  restoreSdkBackup,
} from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerSdkCommand(program: Command): void {
  const sdk = program.command("sdk").description("Check or update the FTC Robot Controller SDK");

  sdk
    .command("check")
    .description("Compare local FTC Maven SDK version to GitHub Releases")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .option("--fail-if-behind", "Exit nonzero when the local SDK is behind latest")
    .option("--version <tag>", "Compare against a specific release tag instead of latest")
    .action(
      async (options: {
        json?: boolean;
        verbose?: boolean;
        failIfBehind?: boolean;
        version?: string;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const report = await checkSdkStatus({
          projectRoot: ctx.cwd,
          targetTag: options.version,
        });

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log("FTC SDK Check\n");
          console.log(`Local:  ${report.local.version ?? "(unknown)"}`);
          if (report.remote) {
            console.log(`Remote: ${report.remote.version} (${report.remote.tagName})`);
            console.log(`URL:    ${report.remote.htmlUrl}`);
          }
          console.log(`Status: ${report.freshness}`);
          console.log(`\n${report.message}`);
          if (report.local.mismatchedVersions) {
            console.log("\nArtifact versions:");
            for (const art of report.local.artifacts) {
              console.log(`  - ${art.name}: ${art.version}`);
            }
          }
          if (report.error && options.verbose) {
            printFriendlyError(report.error, true);
          } else if (report.error && report.freshness === "unknown") {
            printFriendlyError(report.error, options.verbose === true);
          }
        }

        if (options.failIfBehind && report.freshness === "behind") {
          process.exitCode = 1;
          return;
        }
        if (report.error && !report.local.version) {
          process.exitCode = 1;
          return;
        }
        if (report.freshness === "unknown" && report.error?.code === "SDK_UPDATE_NETWORK") {
          process.exitCode = 1;
          return;
        }
        process.exitCode = 0;
      },
    );

  sdk
    .command("update")
    .description(
      "Sync SDK-owned project files from an official FTC release (never touches TeamCode)",
    )
    .option("--dry-run", "Show the planned file sync without writing")
    .option("--yes", "Apply the update without an interactive confirmation prompt")
    .option("--force", "Allow update when the git working tree is dirty")
    .option("--version <tag>", "Update to a specific release tag instead of latest")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        dryRun?: boolean;
        yes?: boolean;
        force?: boolean;
        version?: string;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);

        if (!options.dryRun && !options.yes && process.stdin.isTTY) {
          // Interactive confirmation for human terminals
          const status = await checkSdkStatus({
            projectRoot: ctx.cwd,
            targetTag: options.version,
          });
          console.log(status.message);
          console.log(
            "This will overwrite SDK-owned files (FtcRobotController, Gradle files, wrapper).",
          );
          console.log(
            "TeamCode will not be modified. A backup will be written under .ftc-dev-tools/backups/.",
          );
          const ok = await confirm("Continue with SDK update?");
          if (!ok) {
            const aborted = {
              success: false,
              dryRun: false,
              appliedPaths: [],
              message: "SDK update cancelled.",
            };
            if (options.json) {
              console.log(JSON.stringify(aborted, null, 2));
            } else {
              console.log("Cancelled.");
            }
            process.exitCode = 1;
            return;
          }
          options.yes = true;
        }

        const result = await applySdkUpdate({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          dryRun: options.dryRun === true,
          yes: options.yes === true || options.dryRun === true,
          force: options.force === true,
          targetTag: options.version,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.plan) {
            console.log("\nPlanned paths:");
            for (const entry of result.plan.entries) {
              console.log(`  [${entry.action}] ${entry.relativePath}`);
            }
            for (const warning of result.plan.warnings) {
              console.log(`\nWarning: ${warning}`);
            }
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }

        process.exitCode = result.success ? 0 : 1;
      },
    );

  sdk
    .command("backups")
    .description("List SDK update backups under .ftc-dev-tools/backups/")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext(process.cwd(), false);
      const backups = await listSdkBackups(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify({ backups }, null, 2));
        return;
      }
      if (backups.length === 0) {
        console.log("No SDK backups found.");
        return;
      }
      console.log("SDK backups:\n");
      for (const backup of backups) {
        console.log(`  ${backup.id}  (${backup.createdAt})`);
      }
    });

  sdk
    .command("restore")
    .description("Restore SDK-owned paths from a backup (rollback / switch versions)")
    .argument("<backup-id>", "Backup folder id (see ftc sdk backups)")
    .option("--yes", "Apply restore without an interactive confirmation prompt")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (backupId: string, options: { yes?: boolean; json?: boolean }) => {
      const ctx = createCliContext(process.cwd(), false);
      if (!options.yes && process.stdin.isTTY) {
        console.log(`This will overwrite SDK-owned paths from backup ${backupId}.`);
        const ok = await confirm("Continue with SDK restore?");
        if (!ok) {
          process.exitCode = 1;
          console.log("Cancelled.");
          return;
        }
      } else if (!options.yes) {
        console.error("Refusing restore without --yes in non-interactive mode.");
        process.exitCode = 1;
        return;
      }

      const result = await restoreSdkBackup({
        projectRoot: ctx.cwd,
        backupId,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
        for (const p of result.restoredPaths) {
          console.log(`  ${p}`);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });
}

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
