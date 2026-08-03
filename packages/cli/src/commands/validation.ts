import type { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import {
  collectEnvironmentSnapshot,
  collectGoldenPathBundle,
  formatGoldenPathBundleMarkdown,
  getGoldenPathValidationStatus,
  SUPPORTED_ALPHA_CONFIGURATION,
} from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";

export function registerValidationCommand(program: Command): void {
  const validation = program
    .command("validation")
    .description("Golden-path validation status, environment snapshot, and diagnostic bundles");

  validation
    .command("status")
    .description("Report mock-tested coverage and pending physical validation checklists")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const report = getGoldenPathValidationStatus();
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Golden-path validation status\n");
      console.log(report.message);
      console.log(`Mock-tested features: ${report.summary.mockTestedFeatures}`);
      console.log(`Hardware-validated features: ${report.summary.hardwareValidatedFeatures}`);
      console.log(`Pending hardware checks: ${report.summary.pendingHardwareChecks}`);
      console.log("\nSupported alpha configuration:");
      const alpha = report.supportedAlphaConfiguration;
      console.log(`  Host OS: ${alpha.hostOs}`);
      console.log(`  IDEs: ${alpha.ides.join(", ")}`);
      console.log(`  Robot: ${alpha.robotPlatform} (${alpha.robotLanguage})`);
      console.log(`  FTC SDK: ${alpha.ftcSdkRange}`);
      console.log(`  Connection: ${alpha.primaryConnection}`);
      console.log("\nAutomated coverage:");
      for (const [key, covered] of Object.entries(report.automatedCoverage)) {
        console.log(`  ${key}: ${covered ? "yes" : "no"}`);
      }
      console.log("\nHardware checklists (pending until field runs):");
      for (const row of report.hardwareChecklists) {
        const blocked = row.blockedReason ? ` — ${row.blockedReason}` : "";
        const evidence = row.evidenceDate ? ` (evidence: ${row.evidenceDate})` : "";
        console.log(`  [${row.status}] ${row.id}: ${row.label}${evidence}${blocked}`);
      }
    });

  validation
    .command("env")
    .description("Print version and environment snapshot for golden-path troubleshooting")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--extension-version <version>", "VS Code/Cursor extension version when known")
    .action(async (options: { json?: boolean; extensionVersion?: string }) => {
      const ctx = createCliContext(process.cwd());
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }

      const snapshot = await collectEnvironmentSnapshot({
        cwd: ctx.cwd,
        runner: ctx.runner,
        projectAdapter: ctx.adapter,
        deviceProvider,
        extensionVersion: options.extensionVersion,
      });

      if (options.json) {
        console.log(JSON.stringify(snapshot, null, 2));
        return;
      }

      console.log("FTC Dev Tools environment snapshot\n");
      console.log(`Product version: ${snapshot.ftcDevToolsVersion}`);
      if (snapshot.extensionVersion) {
        console.log(`Extension version: ${snapshot.extensionVersion}`);
      }
      console.log(`CLI on PATH: ${snapshot.cliOnPath.found ? "yes" : "no"}`);
      if (snapshot.cliOnPath.version) {
        console.log(`CLI version: ${snapshot.cliOnPath.version}`);
      }
      console.log(`Host: ${snapshot.host.platform} ${snapshot.host.osRelease}`);
      console.log(`Java: ${snapshot.java?.found ? snapshot.java.versionLine : "not found"}`);
      console.log(`ADB: ${snapshot.adb?.found ? snapshot.adb.versionLine : "not found"}`);
      if (snapshot.androidSdk?.found) {
        console.log(`Android SDK: ${snapshot.androidSdk.path}`);
      }
      if (snapshot.gradle?.wrapperFound) {
        console.log(`Gradle: ${snapshot.gradle.versionLine ?? "wrapper found"}`);
      }
      if (snapshot.ftcSdk?.version) {
        console.log(
          `FTC SDK: ${snapshot.ftcSdk.version} (${snapshot.ftcSdk.freshness ?? "unknown"})`,
        );
      }
      if (snapshot.project) {
        console.log(
          `Project: ${snapshot.project.detected ? snapshot.project.root : "not detected at cwd"}`,
        );
        if (snapshot.project.nearbyRoots?.length) {
          console.log(`Nearby FTC roots: ${snapshot.project.nearbyRoots.join(", ")}`);
        }
      }
      if (snapshot.robot) {
        console.log(`Devices: ${snapshot.robot.deviceCount ?? 0}`);
        if (snapshot.robot.selectionMessage) {
          console.log(`Selection: ${snapshot.robot.selectionMessage}`);
        }
      }
      if (snapshot.versionSkewWarnings.length > 0) {
        console.log("\nWarnings:");
        for (const warning of snapshot.versionSkewWarnings) {
          console.log(`  - ${warning}`);
        }
      }
    });

  const bundle = validation
    .command("bundle")
    .description("Collect a bounded, redacted diagnostic bundle for golden-path failures");

  bundle
    .command("collect")
    .description("Write a diagnostic bundle to stdout or a file")
    .option("--json", "Emit JSON bundle (default)")
    .option("--markdown", "Emit human-readable markdown summary")
    .option("--redact", "Redact serial numbers, IPs, and home-directory paths")
    .option("--extension-version <version>", "VS Code/Cursor extension version when known")
    .option("-o, --output <path>", "Write bundle to file instead of stdout")
    .option("--skip-doctor", "Omit doctor report from bundle")
    .action(
      async (options: {
        json?: boolean;
        markdown?: boolean;
        redact?: boolean;
        extensionVersion?: string;
        output?: string;
        skipDoctor?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd());
        let deviceProvider;
        try {
          deviceProvider = await ctx.createDeviceProvider();
        } catch {
          deviceProvider = undefined;
        }

        const collected = await collectGoldenPathBundle({
          cwd: ctx.cwd,
          runner: ctx.runner,
          projectAdapter: ctx.adapter,
          deviceProvider,
          extensionVersion: options.extensionVersion,
          includeDoctor: options.skipDoctor !== true,
          redact: options.redact === true,
        });

        const useMarkdown = options.markdown === true;
        const payload = useMarkdown
          ? formatGoldenPathBundleMarkdown(collected)
          : JSON.stringify(collected, null, 2);

        if (options.output) {
          await fs.mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
          await fs.writeFile(options.output, payload, "utf8");
          console.log(`Diagnostic bundle written to ${options.output}`);
          return;
        }

        console.log(payload);
      },
    );

  validation
    .command("alpha-config")
    .description("Show the supported alpha target configuration")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      if (options.json) {
        console.log(JSON.stringify(SUPPORTED_ALPHA_CONFIGURATION, null, 2));
        return;
      }
      console.log("Supported alpha configuration\n");
      const alpha = SUPPORTED_ALPHA_CONFIGURATION;
      console.log(`Host OS: ${alpha.hostOs}`);
      console.log(`IDEs: ${alpha.ides.join(", ")}`);
      console.log(`Robot platform: ${alpha.robotPlatform}`);
      console.log(`Robot language: ${alpha.robotLanguage}`);
      console.log(`Project type: ${alpha.projectType}`);
      console.log(`FTC SDK: ${alpha.ftcSdkRange}`);
      console.log(`Primary connection: ${alpha.primaryConnection}`);
      console.log(`Build system: ${alpha.buildSystem}`);
      console.log(`Deployment: ${alpha.deployment}`);
      console.log(`Logs: ${alpha.logs}`);
    });
}
