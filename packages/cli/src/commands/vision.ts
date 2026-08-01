import type { Command } from "commander";
import {
  discoverVisionDevices,
  discoverVisionWorkspace,
  diffLimelightPipeline,
  getFtcDashboardStatus,
  getLimelightResults,
  getLimelightStatus,
  getEasyOpenCvStatus,
  getVisionBridgeStatus,
  getVisionPortalStatus,
  getVisionStatus,
  collectVisionDiagnostics,
  getVisionCliCatalog,
  buildDeferredVisionCliResult,
  openVisionTarget,
  formatEndpointTable,
  VISION_CLI_EXIT,
  interpretFromUnknown,
  openFtcDashboard,
  scanLimelightArtifacts,
  scaffoldVisionBridge,
  scaffoldVisionCodegen,
  parseVisionCodegenKind,
  VISION_CODEGEN_KINDS,
  validateLimelightArtifacts,
  getVisionValidationStatus,
  tryCreateOptionalDeviceProvider,
} from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";
import { printFriendlyError } from "../context.js";
import {
  attachVisionCommonOptions,
  emitDeferredVisionCommand,
  emitVisionJson,
} from "./vision-common.js";

export function registerVisionCommand(program: Command): void {
  const vision = program
    .command("vision")
    .description("Vision Lab configuration and workspace discovery");

  vision
    .command("status")
    .description("Show vision config and detected workspace signals")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const report = await getVisionStatus(process.cwd());
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Vision Lab Status\n");
      console.log(report.message);
      if (report.config.defaultProviderId) {
        console.log(`Configured default provider: ${report.config.defaultProviderId}`);
      }
      if (report.config.enabledProviderIds?.length) {
        console.log(`Enabled providers: ${report.config.enabledProviderIds.join(", ")}`);
      }
      if (report.discovery.suggestedDefaultProviderId) {
        console.log(`Suggested default provider: ${report.discovery.suggestedDefaultProviderId}`);
      }
      for (const signal of report.discovery.signals) {
        console.log(
          `  [${signal.kind}] ${signal.evidence}${signal.relativePath ? ` (${signal.relativePath})` : ""}`,
        );
      }
      for (const dir of report.discovery.pipelineDirectories) {
        console.log(`  Pipeline dir: ${dir.relativePath} (${dir.fileCount} files)`);
      }
      for (const warning of [...report.configWarnings, ...report.discovery.warnings]) {
        console.log(`Warning: ${warning}`);
      }
      for (const error of report.configErrors) {
        console.log(`Error: ${error}`);
      }
    });

  vision
    .command("diagnostics")
    .description("Aggregate vision setup diagnostics with student-friendly guidance (VISION-14)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--no-probe", "Skip network reachability probes")
    .action(async (options: { json?: boolean; probe?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }

      const report = await collectVisionDiagnostics(process.cwd(), {
        deviceProvider,
        runner: ctx.runner,
        probeNetwork: options.probe === false ? false : undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Vision diagnostics\n");
      console.log(report.message);
      console.log(`Network probe: ${report.probeNetwork ? "yes" : "no"}`);
      if (report.diagnostics.length === 0) {
        console.log("No issues reported.");
        return;
      }
      for (const diagnostic of report.diagnostics) {
        const mark =
          diagnostic.severity === "error" ? "✗" : diagnostic.severity === "warn" ? "!" : "·";
        console.log(`\n${mark} [${diagnostic.code}] ${diagnostic.title}`);
        console.log(`  ${diagnostic.summary}`);
        if (diagnostic.evidence.length > 0) {
          for (const line of diagnostic.evidence) {
            console.log(`  - ${line}`);
          }
        }
        if (diagnostic.suggestedActions.length > 0) {
          console.log("  Suggested actions:");
          for (const action of diagnostic.suggestedActions) {
            console.log(`    • ${action}`);
          }
        }
      }
    });

  vision
    .command("diagnose")
    .description("Alias for `ftc vision diagnostics`")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--no-probe", "Skip network reachability probes")
    .option("--redact", "Redact serial numbers and IP addresses in JSON output")
    .action(async (options: { json?: boolean; probe?: boolean; redact?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      const deviceProvider = await tryCreateOptionalDeviceProvider(() =>
        ctx.createDeviceProvider(),
      );
      const report = await collectVisionDiagnostics(process.cwd(), {
        deviceProvider,
        runner: ctx.runner,
        probeNetwork: options.probe === false ? false : undefined,
      });
      if (options.json) {
        emitVisionJson("ftc vision diagnose", report, options);
        return;
      }
      console.log("Vision diagnostics\n");
      console.log(report.message);
      console.log(`Network probe: ${report.probeNetwork ? "yes" : "no"}`);
      for (const diagnostic of report.diagnostics) {
        const mark =
          diagnostic.severity === "error" ? "✗" : diagnostic.severity === "warn" ? "!" : "·";
        console.log(`\n${mark} [${diagnostic.code}] ${diagnostic.title}`);
        console.log(`  ${diagnostic.summary}`);
      }
    });

  attachVisionCommonOptions(
    vision
      .command("open")
      .description("Open Limelight web UI or FTC Dashboard in the default browser"),
  )
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (options: {
        json?: boolean;
        provider?: string;
        endpoint?: string;
        host?: string;
        url?: string;
        timeout?: number;
        redact?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd());
        const deviceProvider = await tryCreateOptionalDeviceProvider(() =>
          ctx.createDeviceProvider(),
        );
        try {
          const result = await openVisionTarget(ctx.cwd, {
            provider: options.provider,
            endpoint: options.endpoint,
            host: options.host,
            url: options.url,
            timeoutMs: options.timeout,
            deviceProvider,
            runner: ctx.runner,
          });
          if (options.json) {
            emitVisionJson("ftc vision open", result, options);
            return;
          }
          console.log(result.message);
          if (!result.opened) {
            process.exitCode = VISION_CLI_EXIT.UNREACHABLE;
          }
        } catch (error) {
          await printFriendlyError(interpretFromUnknown(error), false);
          process.exitCode = VISION_CLI_EXIT.ERROR;
        }
      },
    );

  vision
    .command("capture")
    .description("Capture a still frame (deferred — cataloged for VISION-15)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--redact", "Redact serial numbers and IP addresses in JSON output")
    .action((options: { json?: boolean; redact?: boolean }) => {
      emitDeferredVisionCommand(buildDeferredVisionCliResult("ftc vision capture"), options);
    });

  const validation = vision
    .command("validation")
    .description("Automated test coverage and hardware validation status (VISION-17)");

  validation
    .command("status")
    .description("Report mock-tested coverage and pending physical validation checklists")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const report = getVisionValidationStatus();
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Vision validation status\n");
      console.log(report.message);
      console.log(`Mock-tested features: ${report.summary.mockTestedFeatures}`);
      console.log(`Hardware-validated features: ${report.summary.hardwareValidatedFeatures}`);
      console.log(`Pending hardware checks: ${report.summary.pendingHardwareChecks}`);
      console.log("\nAutomated coverage:");
      for (const [key, covered] of Object.entries(report.automatedCoverage)) {
        console.log(`  ${key}: ${covered ? "yes" : "no"}`);
      }
      console.log("\nHardware checklists (pending until field runs):");
      for (const row of report.hardwareChecklists) {
        const blocked = row.blockedReason ? ` — ${row.blockedReason}` : "";
        console.log(`  [${row.status}] ${row.id}: ${row.label}${blocked}`);
      }
    });

  vision
    .command("catalog")
    .description("List vision CLI commands and deferred capabilities")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const catalog = getVisionCliCatalog();
      if (options.json) {
        console.log(JSON.stringify({ schemaVersion: "1.0.0", catalog }, null, 2));
        return;
      }
      console.log("Vision CLI catalog\n");
      for (const entry of catalog) {
        const status = entry.available ? "available" : "deferred";
        console.log(`${entry.command} [${status}]`);
        console.log(`  ${entry.summary}`);
        if (entry.equivalent) {
          console.log(`  equivalent: ${entry.equivalent}`);
        }
        if (entry.deferredReason) {
          console.log(`  deferred: ${entry.deferredReason}`);
        }
      }
    });

  vision
    .command("discover")
    .description("Scan TeamCode and Gradle for vision library signals")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const discovery = await discoverVisionWorkspace(process.cwd());
      if (options.json) {
        console.log(JSON.stringify(discovery, null, 2));
        return;
      }

      console.log("Vision workspace discovery\n");
      if (!discovery.isOfficialFtcProject) {
        console.log("Not an official FTC project.");
        return;
      }
      if (discovery.signals.length === 0) {
        console.log("No vision signals detected.");
      } else {
        for (const signal of discovery.signals) {
          console.log(`${signal.kind} → ${signal.suggestedProviderId}`);
          console.log(`  ${signal.evidence}`);
        }
      }
      for (const dir of discovery.pipelineDirectories) {
        console.log(`Pipeline directory: ${dir.relativePath} (${dir.fileCount} files)`);
      }
    });

  vision
    .command("devices")
    .description("Discover vision endpoints and probe local-network services")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--no-probe", "Skip network reachability checks")
    .option("--timeout <ms>", "Network probe timeout in milliseconds", (value) =>
      Number.parseInt(value, 10),
    )
    .option("--redact", "Redact serial numbers and IP addresses in JSON output")
    .action(
      async (options: { json?: boolean; probe?: boolean; timeout?: number; redact?: boolean }) => {
        const ctx = createCliContext();
        const deviceProvider = await tryCreateOptionalDeviceProvider(() =>
          ctx.createDeviceProvider(),
        );

        const report = await discoverVisionDevices(ctx.cwd, {
          deviceProvider,
          runner: ctx.runner,
          probeNetwork: options.probe !== false,
          timeoutMs: options.timeout,
        });

        if (options.json) {
          emitVisionJson("ftc vision devices", report, options);
          return;
        }

        console.log("Vision endpoint discovery\n");
        console.log(report.message);
        if (report.requiresSelection) {
          for (const reason of report.selectionReasons) {
            console.log(`Selection required: ${reason}`);
          }
          process.exitCode = VISION_CLI_EXIT.SELECTION_REQUIRED;
        }
        const table = formatEndpointTable(
          report.endpoints.map((endpoint) => ({
            kind: endpoint.kind,
            target: endpoint.host ? `${endpoint.host}:${endpoint.port ?? ""}` : "config",
            reachable: endpoint.probe.reachable,
            provider: endpoint.providerId,
          })),
        );
        for (const line of table) {
          console.log(line);
        }
        for (const warning of report.warnings) {
          console.log(`Warning: ${warning}`);
        }
      },
    );

  const pipelinesTop = vision
    .command("pipelines")
    .description("Limelight pipeline-as-code shortcuts (VISION-15 catalog)");

  pipelinesTop
    .command("list")
    .description("List pipeline-as-code artifacts in the workspace")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--redact", "Redact serial numbers and IP addresses in JSON output")
    .action(async (options: { json?: boolean; redact?: boolean }) => {
      const ctx = createCliContext();
      const manifest = await scanLimelightArtifacts(ctx.cwd);
      if (options.json) {
        emitVisionJson("ftc vision pipelines list", manifest, options);
        return;
      }
      console.log("Limelight Vision pipeline artifacts\n");
      console.log(`Directory: ${manifest.pipelineDirectory || "(not configured)"}`);
      for (const pipeline of manifest.pipelines) {
        console.log(
          `  [pipeline${pipeline.slot !== undefined ? ` slot ${pipeline.slot}` : ""}] ${pipeline.relativePath}`,
        );
      }
    });

  pipelinesTop
    .command("validate")
    .description("Validate pipeline JSON syntax and slot assignments")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      const report = await validateLimelightArtifacts(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      console.log("Limelight Vision pipeline validation\n");
      console.log(report.message);
      for (const issue of report.issues) {
        console.log(`  [${issue.severity}] ${issue.relativePath}: ${issue.message}`);
      }
      if (!report.success) {
        process.exitCode = VISION_CLI_EXIT.ERROR;
      }
    });

  pipelinesTop
    .command("compare")
    .description("Compare workspace pipeline file with camera slot (alias for diff)")
    .requiredOption("--slot <n>", "Pipeline slot (0-9)", (value) => Number.parseInt(value, 10))
    .option("--host <address>", "Limelight Vision hostname or IP")
    .option("--path <relative>", "Workspace pipeline file (default: file mapped to slot)")
    .option("--raw", "Include full workspace and camera JSON in output")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (options: {
        slot: number;
        host?: string;
        path?: string;
        raw?: boolean;
        json?: boolean;
      }) => {
        const ctx = createCliContext();
        const deviceProvider = await tryCreateOptionalDeviceProvider(() =>
          ctx.createDeviceProvider(),
        );
        try {
          const report = await diffLimelightPipeline(ctx.cwd, {
            slot: options.slot,
            host: options.host,
            workspacePath: options.path,
            includeRaw: options.raw,
            deviceProvider,
            runner: ctx.runner,
          });
          if (options.json) {
            console.log(JSON.stringify(report, null, 2));
            return;
          }
          console.log("Limelight Vision pipeline compare\n");
          console.log(report.message);
          for (const line of report.humanSummary) {
            console.log(line);
          }
        } catch (error) {
          await printFriendlyError(interpretFromUnknown(error), false);
          process.exitCode = VISION_CLI_EXIT.ERROR;
        }
      },
    );

  for (const deferredCommand of ["pull", "push", "activate", "reload"] as const) {
    pipelinesTop
      .command(deferredCommand)
      .description(`Deferred Limelight pipeline ${deferredCommand} (VISION-05+)`)
      .option("--json", "Emit stable machine-readable JSON")
      .action((options: { json?: boolean }) => {
        emitDeferredVisionCommand(
          buildDeferredVisionCliResult(`ftc vision pipelines ${deferredCommand}`),
          options,
        );
      });
  }

  const sessions = vision
    .command("sessions")
    .description("Vision session recording commands (deferred — see ftc replay status)");

  for (const sessionCommand of ["list", "record", "inspect", "replay", "export"] as const) {
    sessions
      .command(sessionCommand)
      .description(`Deferred session ${sessionCommand} (VISION-13+ / Replay epic)`)
      .option("--json", "Emit stable machine-readable JSON")
      .action((options: { json?: boolean }) => {
        emitDeferredVisionCommand(
          buildDeferredVisionCliResult(`ftc vision sessions ${sessionCommand}`),
          options,
        );
      });
  }

  const limelight = vision
    .command("limelight")
    .description("Limelight Vision HTTP provider (read-only status and results)");

  limelight
    .command("status")
    .description("Read Limelight Vision device status from the HTTP API (port 5807)")
    .option("--host <address>", "Limelight Vision hostname or IP")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { host?: string; json?: boolean }) => {
      const ctx = createCliContext();
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }
      try {
        const report = await getLimelightStatus(ctx.cwd, {
          host: options.host,
          deviceProvider,
          runner: ctx.runner,
        });
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        console.log("Limelight Vision status\n");
        console.log(report.message);
        console.log(`Host: ${report.host} (${report.hostResolution.source})`);
        if (report.deviceName) {
          console.log(`Device: ${report.deviceName}`);
        }
        if (report.pipelineIndex !== undefined) {
          console.log(
            `Pipeline: ${report.pipelineIndex}${report.pipelineType ? ` (${report.pipelineType})` : ""}`,
          );
        }
        if (report.fps !== undefined) {
          console.log(`FPS: ${report.fps.toFixed(1)}`);
        }
        if (report.temperatureCelsius !== undefined) {
          console.log(`CPU temp: ${report.temperatureCelsius.toFixed(1)}°C`);
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  limelight
    .command("results")
    .description("Read normalized Limelight Vision targeting results")
    .option("--host <address>", "Limelight Vision hostname or IP")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { host?: string; json?: boolean }) => {
      const ctx = createCliContext();
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }
      try {
        const report = await getLimelightResults(ctx.cwd, {
          host: options.host,
          deviceProvider,
          runner: ctx.runner,
        });
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        console.log("Limelight Vision results\n");
        console.log(report.message);
        console.log(`Host: ${report.host}`);
        console.log(`Valid target: ${report.target.valid ? "yes" : "no"}`);
        if (report.target.tx !== undefined && report.target.ty !== undefined) {
          console.log(
            `Offset: tx=${report.target.tx.toFixed(2)} ty=${report.target.ty.toFixed(2)}`,
          );
        }
        if (report.target.latencyTotalMs !== undefined) {
          console.log(`Latency: ${report.target.latencyTotalMs.toFixed(1)} ms`);
        }
        if (report.stale) {
          console.log("Warning: results may be stale.");
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  const pipelines = limelight
    .command("pipelines")
    .description("Limelight Vision pipeline-as-code (scan, validate, diff)");

  pipelines
    .command("list")
    .description("List pipeline-as-code artifacts in the workspace")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      try {
        const manifest = await scanLimelightArtifacts(ctx.cwd);
        if (options.json) {
          console.log(JSON.stringify(manifest, null, 2));
          return;
        }
        console.log("Limelight Vision pipeline artifacts\n");
        console.log(`Directory: ${manifest.pipelineDirectory || "(not configured)"}`);
        for (const pipeline of manifest.pipelines) {
          console.log(
            `  [pipeline${pipeline.slot !== undefined ? ` slot ${pipeline.slot}` : ""}] ${pipeline.relativePath}`,
          );
        }
        for (const script of manifest.pythonScripts) {
          console.log(`  [python] ${script.relativePath}`);
        }
        for (const fieldMap of manifest.fieldMaps) {
          console.log(`  [field-map] ${fieldMap.relativePath}`);
        }
        for (const warning of manifest.warnings) {
          console.log(`Warning: ${warning}`);
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  pipelines
    .command("validate")
    .description("Validate pipeline JSON syntax and slot assignments")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      try {
        const report = await validateLimelightArtifacts(ctx.cwd);
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        console.log("Limelight Vision pipeline validation\n");
        console.log(report.message);
        for (const issue of report.issues) {
          console.log(`  [${issue.severity}] ${issue.relativePath}: ${issue.message}`);
        }
        if (!report.success) {
          process.exitCode = 1;
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  pipelines
    .command("diff")
    .description("Compare workspace pipeline file with camera slot")
    .requiredOption("--slot <n>", "Pipeline slot (0-9)", (value) => Number.parseInt(value, 10))
    .option("--host <address>", "Limelight Vision hostname or IP")
    .option("--path <relative>", "Workspace pipeline file (default: file mapped to slot)")
    .option("--raw", "Include full workspace and camera JSON in output")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (options: {
        slot: number;
        host?: string;
        path?: string;
        raw?: boolean;
        json?: boolean;
      }) => {
        const ctx = createCliContext();
        let deviceProvider;
        try {
          deviceProvider = await ctx.createDeviceProvider();
        } catch {
          deviceProvider = undefined;
        }
        try {
          const report = await diffLimelightPipeline(ctx.cwd, {
            slot: options.slot,
            host: options.host,
            workspacePath: options.path,
            includeRaw: options.raw,
            deviceProvider,
            runner: ctx.runner,
          });
          if (options.json) {
            console.log(JSON.stringify(report, null, 2));
            return;
          }
          console.log("Limelight Vision pipeline diff\n");
          console.log(report.message);
          for (const line of report.humanSummary) {
            console.log(line);
          }
        } catch (error) {
          await printFriendlyError(interpretFromUnknown(error), false);
          process.exitCode = 1;
        }
      },
    );

  const dashboard = vision
    .command("dashboard")
    .description("FTC Dashboard interoperability (detect, status, open)");

  dashboard
    .command("status")
    .description("Detect FTC Dashboard dependency and probe reachability")
    .option("--url <address>", "Dashboard URL or hostname")
    .option("--host <address>", "Robot hostname (builds http://host:8080/dash)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--no-probe", "Skip network reachability checks")
    .action(async (options: { url?: string; host?: string; json?: boolean; probe?: boolean }) => {
      const ctx = createCliContext();
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }
      try {
        const report = await getFtcDashboardStatus(ctx.cwd, {
          url: options.url,
          host: options.host,
          deviceProvider,
          runner: ctx.runner,
          probeNetwork: options.probe !== false,
        });
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }
        console.log("FTC Dashboard status\n");
        console.log(report.message);
        for (const line of report.humanSummary) {
          console.log(line);
        }
        for (const warning of report.warnings) {
          console.log(`Warning: ${warning}`);
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  dashboard
    .command("open")
    .description("Open FTC Dashboard in the default browser")
    .option("--url <address>", "Dashboard URL or hostname")
    .option("--host <address>", "Robot hostname (builds http://host:8080/dash)")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { url?: string; host?: string; json?: boolean }) => {
      const ctx = createCliContext();
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }
      try {
        const result = await openFtcDashboard(ctx.cwd, {
          url: options.url,
          host: options.host,
          deviceProvider,
          runner: ctx.runner,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(result.message);
        if (!result.opened) {
          process.exitCode = 1;
        }
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), false);
        process.exitCode = 1;
      }
    });

  const bridge = vision
    .command("bridge")
    .description("Optional robot-side vision diagnostic bridge (VISION-07)");

  bridge
    .command("status")
    .description("Report bridge scaffold status and preferred diagnostic transports")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      const report = await getVisionBridgeStatus(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      console.log("Vision diagnostic bridge status\n");
      console.log(report.message);
      console.log(`Schema: ${report.schemaVersion} | Bridge code: ${report.bridgeCodeVersion}`);
      console.log(`VisionPortal detected: ${report.visionPortalDetected ? "yes" : "no"}`);
      console.log(`FTC Dashboard detected: ${report.ftcDashboardDetected ? "yes" : "no"}`);
      console.log(
        `Bridge utility: ${report.bridgeUtility.present ? report.bridgeUtility.relativePath : "missing"}`,
      );
      console.log(
        `Diagnostic OpMode: ${report.diagnosticOpMode.present ? report.diagnosticOpMode.relativePath : "missing"}`,
      );
      console.log(`Preferred transports: ${report.preferredTransports.join(", ")}`);
      for (const warning of report.warnings) {
        console.log(`Warning: ${warning}`);
      }
    });

  bridge
    .command("scaffold")
    .description("Generate optional FtcVisionDiagnosticBridge + diagnostic OpMode in TeamCode")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode.vision)")
    .option("--yes", "Apply scaffold (required unless --dry-run)")
    .option("--dry-run", "Show planned files without writing")
    .option("--force", "Overwrite existing bridge files")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (options: {
        package?: string;
        yes?: boolean;
        dryRun?: boolean;
        force?: boolean;
        json?: boolean;
      }) => {
        const ctx = createCliContext();
        const result = await scaffoldVisionBridge({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          packageName: options.package,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
          force: options.force === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("Vision bridge scaffold\n");
          console.log(result.message);
          for (const entry of result.plan) {
            console.log(`  [${entry.action}] ${entry.relativePath}`);
          }
          for (const warning of result.warnings) {
            console.log(`Warning: ${warning}`);
          }
          if (result.error) {
            await printFriendlyError(result.error, false);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  const visionportal = vision
    .command("visionportal")
    .description("VisionPortal static analysis and bridge integration (VISION-08)");

  visionportal
    .command("status")
    .description("Scan TeamCode for VisionPortal camera, stream, and processor configuration")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      const report = await getVisionPortalStatus(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("VisionPortal status\n");
      console.log(report.message);
      for (const line of report.humanSummary) {
        console.log(line);
      }
      if (report.discovery.requiresSelection) {
        for (const reason of report.discovery.selectionReasons) {
          console.log(`Selection required: ${reason}`);
        }
      }
      for (const warning of report.discovery.warnings) {
        console.log(`Warning: ${warning}`);
      }
      console.log("\nCapabilities:");
      for (const [key, enabled] of Object.entries(report.capabilities)) {
        console.log(`  ${key}: ${enabled ? "yes" : "deferred"}`);
      }
    });

  const easyopencv = vision
    .command("easyopencv")
    .description("EasyOpenCV static analysis and desktop replay hints (VISION-09)");

  easyopencv
    .command("status")
    .description("Scan Gradle and TeamCode for EasyOpenCV pipelines and webcam setup")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      const report = await getEasyOpenCvStatus(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("EasyOpenCV status\n");
      console.log(report.message);
      for (const line of report.humanSummary) {
        console.log(line);
      }
      if (report.discovery.requiresSelection) {
        for (const reason of report.discovery.selectionReasons) {
          console.log(`Selection required: ${reason}`);
        }
      }
      for (const warning of report.discovery.warnings) {
        console.log(`Warning: ${warning}`);
      }
      console.log("\nCapabilities:");
      for (const [key, enabled] of Object.entries(report.capabilities)) {
        console.log(`  ${key}: ${enabled ? "yes" : "deferred"}`);
      }
    });

  const codegen = vision
    .command("codegen")
    .description("Generate Java TeamCode vision stubs (VISION-12)");

  codegen
    .command("list")
    .description("List supported vision codegen kinds (Java TeamCode only)")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const kinds = VISION_CODEGEN_KINDS.map((entry) => ({
        kind: entry.kind,
        label: entry.label,
        description: entry.description,
        language: "java",
      }));
      if (options.json) {
        console.log(JSON.stringify({ kinds, language: "java" }, null, 2));
        return;
      }
      console.log("Vision codegen kinds (Java TeamCode only)\n");
      for (const entry of kinds) {
        console.log(`  ${entry.kind}`);
        console.log(`    ${entry.label} — ${entry.description}`);
      }
    });

  codegen
    .command("scaffold <kind>")
    .description("Generate Java vision OpMode and helper classes")
    .option("--class <name>", "Java OpMode class name (required)")
    .option("--pipeline-class <name>", "Pipeline class name (EasyOpenCV only)")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode.vision)")
    .option("--camera <name>", "Webcam name from robot configuration")
    .option("--config <name>", "Robot configuration XML base name")
    .option("--type <teleop|autonomous>", "OpMode type", "teleop")
    .option("--style <linear|iterative>", "OpMode style", "linear")
    .option("--group <name>", "OpMode group annotation")
    .option("--name <name>", "OpMode display name (defaults to class name)")
    .option("--limelight-table <name>", "Limelight NetworkTables table name", "limelight")
    .option("--dashboard", "Include FTC Dashboard camera stream when supported")
    .option("--no-dashboard", "Disable automatic Dashboard stream for EasyOpenCV")
    .option("--dry-run", "Preview generated Java without writing files")
    .option("--yes", "Apply codegen (required unless --dry-run)")
    .option("--force", "Overwrite existing files / bypass dirty-tree guard")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (
        kindArg: string,
        options: {
          class?: string;
          pipelineClass?: string;
          package?: string;
          camera?: string;
          config?: string;
          type?: "teleop" | "autonomous";
          style?: "linear" | "iterative";
          group?: string;
          name?: string;
          limelightTable?: string;
          dashboard?: boolean;
          noDashboard?: boolean;
          dryRun?: boolean;
          yes?: boolean;
          force?: boolean;
          json?: boolean;
        },
      ) => {
        const ctx = createCliContext();
        const parsedKind = parseVisionCodegenKind(kindArg);
        if (!parsedKind) {
          console.error(`Unknown codegen kind: ${kindArg}. Run \`ftc vision codegen list\`.`);
          process.exitCode = 1;
          return;
        }
        const className = options.class?.trim();
        if (!className) {
          console.error("--class is required.");
          process.exitCode = 1;
          return;
        }

        const useDashboard =
          options.noDashboard === true ? false : options.dashboard === true ? true : undefined;

        const result = await scaffoldVisionCodegen({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          kind: parsedKind,
          className,
          pipelineClassName: options.pipelineClass,
          packageName: options.package,
          cameraName: options.camera,
          configName: options.config,
          opModeKind: options.type,
          style: options.style,
          group: options.group,
          name: options.name,
          limelightTableName: options.limelightTable,
          useDashboardStream: useDashboard,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
          force: options.force === true,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("Vision codegen\n");
          console.log(result.message);
          console.log(`Language: ${result.language}`);
          if (result.cameraName) {
            console.log(`Camera: ${result.cameraName}`);
          }
          if (result.configName) {
            console.log(`Robot config: ${result.configName}`);
          }
          for (const entry of result.plan) {
            console.log(`  [${entry.action}] ${entry.relativePath}`);
          }
          for (const warning of result.warnings) {
            console.log(`Warning: ${warning}`);
          }
          if (result.sourcePreview && (options.dryRun || !result.success)) {
            console.log("\n--- preview ---\n");
            console.log(result.sourcePreview);
          }
          if (result.error) {
            await printFriendlyError(result.error, false);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  registerVisionCodegenShortcut(codegen, "limelight", "limelight");
  registerVisionCodegenShortcut(codegen, "easyopencv", "easyopencv");
  registerVisionCodegenShortcut(codegen, "visionportal", "visionportal-apriltag");

  codegen
    .command("diagnostic-opmode")
    .description("Shortcut for diagnostic bridge scaffold (VISION-07)")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode.vision)")
    .option("--yes", "Apply scaffold (required unless --dry-run)")
    .option("--dry-run", "Show planned files without writing")
    .option("--force", "Overwrite existing bridge files")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      async (options: {
        package?: string;
        yes?: boolean;
        dryRun?: boolean;
        force?: boolean;
        json?: boolean;
      }) => {
        const ctx = createCliContext();
        const result = await scaffoldVisionBridge({
          projectRoot: ctx.cwd,
          runner: ctx.runner,
          packageName: options.package,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
          force: options.force === true,
        });
        if (options.json) {
          emitVisionJson("ftc vision codegen diagnostic-opmode", result, options);
        } else {
          console.log("Vision diagnostic bridge scaffold\n");
          console.log(result.message);
          for (const entry of result.plan) {
            console.log(`  [${entry.action}] ${entry.relativePath}`);
          }
          if (result.error) {
            await printFriendlyError(result.error, false);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );
}

function registerVisionCodegenShortcut(codegen: Command, commandName: string, kind: string): void {
  codegen
    .command(commandName)
    .description(`Shortcut for \`ftc vision codegen scaffold ${kind}\``)
    .option("--class <name>", "Java OpMode class name (required)")
    .option("--pipeline-class <name>", "Pipeline class name (EasyOpenCV only)")
    .option("--package <name>", "Java package (default org.firstinspires.ftc.teamcode.vision)")
    .option("--camera <name>", "Webcam name from robot configuration")
    .option("--config <name>", "Robot configuration XML base name")
    .option("--type <teleop|autonomous>", "OpMode type", "teleop")
    .option("--style <linear|iterative>", "OpMode style", "linear")
    .option("--group <name>", "OpMode group annotation")
    .option("--name <name>", "OpMode display name (defaults to class name)")
    .option("--limelight-table <name>", "Limelight NetworkTables table name", "limelight")
    .option("--dashboard", "Include FTC Dashboard camera stream when supported")
    .option("--dry-run", "Preview generated Java without writing files")
    .option("--yes", "Apply codegen (required unless --dry-run)")
    .option("--force", "Overwrite existing files / bypass dirty-tree guard")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: Record<string, unknown>) => {
      const ctx = createCliContext();
      const parsedKind = parseVisionCodegenKind(kind);
      if (!parsedKind) {
        console.error(`Unknown codegen kind: ${kind}`);
        process.exitCode = VISION_CLI_EXIT.ERROR;
        return;
      }
      const className = String(options.class ?? "").trim();
      if (!className) {
        console.error("--class is required.");
        process.exitCode = VISION_CLI_EXIT.ERROR;
        return;
      }
      const result = await scaffoldVisionCodegen({
        projectRoot: ctx.cwd,
        runner: ctx.runner,
        kind: parsedKind,
        className,
        pipelineClassName: options.pipelineClass as string | undefined,
        packageName: options.package as string | undefined,
        cameraName: options.camera as string | undefined,
        configName: options.config as string | undefined,
        opModeKind: options.type as "teleop" | "autonomous" | undefined,
        style: options.style as "linear" | "iterative" | undefined,
        group: options.group as string | undefined,
        name: options.name as string | undefined,
        limelightTableName: options.limelightTable as string | undefined,
        useDashboardStream: options.dashboard === true ? true : undefined,
        dryRun: options.dryRun === true,
        yes: options.yes === true,
        force: options.force === true,
      });
      if (options.json) {
        emitVisionJson(`ftc vision codegen ${commandName}`, result, {
          json: true,
          redact: options.redact === true,
        });
      } else {
        console.log(`Vision codegen (${commandName})\n`);
        console.log(result.message);
        for (const entry of result.plan) {
          console.log(`  [${entry.action}] ${entry.relativePath}`);
        }
        if (result.error) {
          await printFriendlyError(result.error, false);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });
}
