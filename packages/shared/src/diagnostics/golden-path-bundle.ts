import type { DoctorReport } from "../types/errors.js";
import type { FriendlyError } from "../types/errors.js";
import type { BuildResult } from "../types/project.js";
import { collectEnvironmentSnapshot, type CollectEnvironmentSnapshotOptions } from "./environment-snapshot.js";
import { redactDiagnosticValue, truncateDiagnosticText } from "./redact.js";
import { runDoctor, type DoctorOptions } from "../doctor/run-doctor.js";

export const GOLDEN_PATH_BUNDLE_SCHEMA_VERSION = "1.0.0";
export const BUNDLE_MAX_BUILD_OUTPUT_CHARS = 4_000;
export const BUNDLE_MAX_LOGCAT_LINES = 50;

export interface GoldenPathDiagnosticBundle {
  schemaVersion: typeof GOLDEN_PATH_BUNDLE_SCHEMA_VERSION;
  generatedAt: string;
  redacted: boolean;
  trigger?: {
    command?: string;
    errorCode?: string;
    errorTitle?: string;
  };
  environment: Awaited<ReturnType<typeof collectEnvironmentSnapshot>>;
  doctor?: DoctorReport;
  devices?: {
    count: number;
    summary: string;
  };
  build?: {
    success: boolean;
    exitCode?: number;
    durationMs?: number;
    errorSummary?: string;
    outputExcerpt?: string;
  };
  deploy?: {
    success: boolean;
    steps?: string[];
    errorCode?: string;
    errorSummary?: string;
  };
  logcatExcerpt?: string[];
  diagnosticCodes: string[];
}

export interface CollectGoldenPathBundleOptions extends CollectEnvironmentSnapshotOptions {
  includeDoctor?: boolean;
  doctorOptions?: Omit<DoctorOptions, "cwd" | "runner" | "projectAdapter" | "deviceProvider">;
  trigger?: GoldenPathDiagnosticBundle["trigger"];
  buildResult?: BuildResult;
  buildError?: FriendlyError;
  deploySteps?: string[];
  deployError?: FriendlyError;
  logcatLines?: string[];
  redact?: boolean;
}

function extractDiagnosticCodes(input: {
  trigger?: GoldenPathDiagnosticBundle["trigger"];
  buildError?: FriendlyError;
  deployError?: FriendlyError;
  doctor?: DoctorReport;
}): string[] {
  const codes = new Set<string>();
  if (input.trigger?.errorCode) {
    codes.add(input.trigger.errorCode);
  }
  if (input.buildError?.code) {
    codes.add(input.buildError.code);
  }
  if (input.deployError?.code) {
    codes.add(input.deployError.code);
  }
  if (input.doctor) {
    for (const check of input.doctor.checks) {
      if (check.friendlyError?.code) {
        codes.add(check.friendlyError.code);
      }
    }
  }
  return [...codes];
}

export async function collectGoldenPathBundle(
  options: CollectGoldenPathBundleOptions,
): Promise<GoldenPathDiagnosticBundle> {
  const environment = await collectEnvironmentSnapshot(options);

  let doctor: DoctorReport | undefined;
  if (options.includeDoctor !== false) {
    doctor = await runDoctor({
      cwd: options.cwd,
      runner: options.runner,
      projectAdapter: options.projectAdapter,
      deviceProvider: options.deviceProvider,
      ...options.doctorOptions,
    });
  }

  let devices: GoldenPathDiagnosticBundle["devices"];
  if (options.deviceProvider) {
    try {
      const list = await options.deviceProvider.listDevices();
      const parts = list.map(
        (d) =>
          `${d.serial} (${d.state}, ${d.authorization ?? "unknown-auth"}, ${d.connectionType ?? "unknown-conn"})`,
      );
      devices = {
        count: list.length,
        summary: parts.length > 0 ? parts.join("; ") : "No devices attached.",
      };
    } catch (error) {
      devices = {
        count: 0,
        summary: error instanceof Error ? error.message : String(error),
      };
    }
  }

  let build: GoldenPathDiagnosticBundle["build"];
  if (options.buildResult) {
    const combined = `${options.buildResult.stdout}\n${options.buildResult.stderr}`.trim();
    build = {
      success: options.buildResult.success,
      exitCode: options.buildResult.exitCode ?? undefined,
      durationMs: options.buildResult.durationMs,
      errorSummary: options.buildError?.summary,
      outputExcerpt: combined
        ? truncateDiagnosticText(combined, BUNDLE_MAX_BUILD_OUTPUT_CHARS)
        : undefined,
    };
  }

  let deploy: GoldenPathDiagnosticBundle["deploy"];
  if (options.deploySteps || options.deployError) {
    deploy = {
      success: !options.deployError,
      steps: options.deploySteps,
      errorCode: options.deployError?.code,
      errorSummary: options.deployError?.summary,
    };
  }

  const logcatExcerpt = options.logcatLines?.slice(-BUNDLE_MAX_LOGCAT_LINES);

  const bundle: GoldenPathDiagnosticBundle = {
    schemaVersion: GOLDEN_PATH_BUNDLE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    redacted: options.redact === true,
    trigger: options.trigger,
    environment,
    doctor,
    devices,
    build,
    deploy,
    logcatExcerpt,
    diagnosticCodes: [],
  };

  bundle.diagnosticCodes = extractDiagnosticCodes({
    trigger: options.trigger,
    buildError: options.buildError,
    deployError: options.deployError,
    doctor,
  });

  if (options.redact === true) {
    return redactDiagnosticValue(bundle) as GoldenPathDiagnosticBundle;
  }
  return bundle;
}

export function formatGoldenPathBundleMarkdown(bundle: GoldenPathDiagnosticBundle): string {
  const lines = [
    "# FTC Dev Tools — golden-path diagnostic bundle",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Redacted: ${bundle.redacted ? "yes" : "no"}`,
    `Product version: ${bundle.environment.ftcDevToolsVersion}`,
    "",
  ];

  if (bundle.trigger?.errorCode) {
    lines.push(
      "## Trigger",
      "",
      `- Command: ${bundle.trigger.command ?? "(unknown)"}`,
      `- Error code: \`${bundle.trigger.errorCode}\``,
      `- Title: ${bundle.trigger.errorTitle ?? "(none)"}`,
      "",
    );
  }

  if (bundle.environment.versionSkewWarnings.length > 0) {
    lines.push("## Version skew warnings", "");
    for (const warning of bundle.environment.versionSkewWarnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  if (bundle.doctor) {
    lines.push(
      "## Doctor summary",
      "",
      `- Ready: ${bundle.doctor.ready}`,
      `- Summary: ${bundle.doctor.summaryLine}`,
      "",
    );
  }

  if (bundle.devices) {
    lines.push("## Devices", "", `- Count: ${bundle.devices.count}`, `- ${bundle.devices.summary}`, "");
  }

  if (bundle.build) {
    lines.push(
      "## Build",
      "",
      `- Success: ${bundle.build.success}`,
      bundle.build.errorSummary ? `- Error: ${bundle.build.errorSummary}` : "",
      "",
    );
  }

  if (bundle.deploy) {
    lines.push(
      "## Deploy",
      "",
      `- Success: ${bundle.deploy.success}`,
      bundle.deploy.errorSummary ? `- Error: ${bundle.deploy.errorSummary}` : "",
      "",
    );
  }

  if (bundle.diagnosticCodes.length > 0) {
    lines.push("## Diagnostic codes", "", ...bundle.diagnosticCodes.map((c) => `- \`${c}\``), "");
  }

  lines.push(
    "---",
    "",
    "This bundle excludes Wi-Fi passwords, tokens, student names, and private repository content.",
    "Attach this file to a GitHub issue or share with a mentor for triage.",
  );

  return lines.filter((line) => line !== undefined).join("\n");
}
