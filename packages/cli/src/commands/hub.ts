import type { Command } from "commander";
import {
  applyHubOsUpdate,
  checkHubUpdate,
  downloadHubOsUpdate,
  getHubStatus,
} from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerHubCommand(program: Command): void {
  const hub = program
    .command("hub")
    .description("Control Hub status and explicit OS update helpers (never automatic)");

  hub
    .command("status")
    .description(
      "Show Control Hub identity, OS/RC versions when readable, and console reachability",
    )
    .option("--device <serial>", "Target device serial")
    .option("--url <url>", "Robot Controller Console base URL")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: { device?: string; url?: string; json?: boolean; verbose?: boolean }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        let deviceProvider;
        try {
          deviceProvider = await ctx.createDeviceProvider();
        } catch {
          deviceProvider = undefined;
        }
        const report = await getHubStatus({
          runner: ctx.runner,
          deviceProvider,
          deviceSerial: options.device,
          consoleUrl: options.url,
        });
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log("Control Hub Status\n");
          console.log(report.message);
          if (report.device) {
            if (report.device.serial) {
              console.log(`Serial:     ${report.device.serial}`);
            }
            console.log(`Connection: ${report.device.connection}`);
            console.log(`OS:         ${report.device.osVersion ?? "(unknown)"}`);
            console.log(`RC app:     ${report.device.robotControllerVersion ?? "(unknown)"}`);
          }
          console.log(
            `Console:    ${report.consoleUrl} (${report.consoleReachable ? "reachable" : "unreachable"})`,
          );
          for (const warning of report.warnings) {
            console.log(`Warning:    ${warning}`);
          }
          if (report.error) {
            printFriendlyError(report.error, options.verbose === true);
          }
        }
        process.exitCode = report.error ? 1 : 0;
      },
    );

  const update = hub
    .command("update")
    .description("Check, download, or apply Control Hub Operating System updates");

  update
    .command("check")
    .description("Compare hub OS version to the published REV changelog catalog")
    .option("--device <serial>", "Target device serial")
    .option("--version <ver>", "Compare against a specific OS version/tag")
    .option("--local-version <ver>", "Override detected local OS version")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .option("--fail-if-behind", "Exit nonzero when the hub OS is behind latest")
    .action(
      async (options: {
        device?: string;
        version?: string;
        localVersion?: string;
        json?: boolean;
        verbose?: boolean;
        failIfBehind?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        let deviceProvider;
        try {
          deviceProvider = await ctx.createDeviceProvider();
        } catch {
          deviceProvider = undefined;
        }
        const report = await checkHubUpdate({
          runner: ctx.runner,
          deviceProvider,
          deviceSerial: options.device,
          version: options.version,
          localOsVersion: options.localVersion,
        });
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log("Control Hub OS Check\n");
          console.log(`Local:  ${report.localOsVersion ?? "(unknown)"}`);
          if (report.remote) {
            console.log(`Remote: ${report.remote.version} (${report.remote.tag})`);
            console.log(`URL:    ${report.remote.downloadUrl}`);
          }
          console.log(`Status: ${report.freshness}`);
          console.log(`\n${report.message}`);
          if (report.error) {
            printFriendlyError(report.error, options.verbose === true);
          }
        }
        if (options.failIfBehind && report.freshness === "behind") {
          process.exitCode = 1;
          return;
        }
        process.exitCode = report.error && report.freshness === "unknown" ? 1 : 0;
      },
    );

  update
    .command("download")
    .description("Download an official Control Hub OS zip into the local cache")
    .option("--version <ver>", "OS version/tag (default: latest from catalog)")
    .option("--url <url>", "Explicit allowlisted download URL")
    .option("--cache-dir <path>", "Override cache directory")
    .option("--dry-run", "Show planned download without writing")
    .option("--yes", "Download the package")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        version?: string;
        url?: string;
        cacheDir?: string;
        dryRun?: boolean;
        yes?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const result = await downloadHubOsUpdate({
          version: options.version,
          downloadUrl: options.url,
          cacheDir: options.cacheDir,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  update
    .command("apply")
    .description(
      "Apply a Control Hub OS update (guided Manage page by default; never automatic/background)",
    )
    .option("--file <path>", "Local OS zip path (default: download/cache latest)")
    .option("--version <ver>", "OS version to download when --file is omitted")
    .option("--device <serial>", "Target device serial")
    .option("--url <url>", "Robot Controller Console base URL")
    .option("--cache-dir <path>", "Override cache directory")
    .option("--attempt-upload", "Best-effort multipart upload to RC Console (experimental)")
    .option("--allow-wifi-adb", "Allow apply when the device is connected over Wi-Fi adb")
    .option("--no-open-console", "Do not open the Manage page in a browser")
    .option("--dry-run", "Show the apply plan without downloading or uploading")
    .option("--yes", "Confirm download/apply (hub will reboot during a real update)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        file?: string;
        version?: string;
        device?: string;
        url?: string;
        cacheDir?: string;
        attemptUpload?: boolean;
        allowWifiAdb?: boolean;
        openConsole?: boolean;
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
        const result = await applyHubOsUpdate({
          runner: ctx.runner,
          deviceProvider,
          deviceSerial: options.device,
          consoleUrl: options.url,
          filePath: options.file,
          version: options.version,
          cacheDir: options.cacheDir,
          attemptUpload: options.attemptUpload === true,
          allowWifiAdb: options.allowWifiAdb === true,
          openConsole: options.openConsole !== false,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.planLines.length > 0) {
            console.log("\nPlan:");
            for (const line of result.planLines) {
              console.log(`  - ${line}`);
            }
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}
