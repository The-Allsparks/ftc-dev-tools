import { addPedroPathing } from "../../pedro/add.js";
import { detectPedroStatus } from "../../pedro/detect.js";
import { scaffoldPedroPathing } from "../../pedro/scaffold.js";
import type {
  AdapterCodegenResult,
  AdapterDetectResult,
  AdapterInstallResult,
  AdapterOperationSupport,
  AdapterPatchResult,
  AdapterReplayHintsResult,
  AdapterSimulationHooksResult,
  AdapterUnsupportedResult,
  AdapterValidateResult,
  IntegrationAdapter,
  IntegrationAdapterCodegenOptions,
  IntegrationAdapterInstallOptions,
  IntegrationAdapterPatchOptions,
} from "../adapter-types.js";
import { unsupportedAdapterResult } from "../adapter-types.js";

const PEDRO_OPERATIONS: readonly AdapterOperationSupport[] = [
  { operation: "detect", supported: true },
  { operation: "validate", supported: true },
  { operation: "install", supported: true },
  { operation: "patch", supported: true },
  { operation: "codegen", supported: true },
  {
    operation: "replayHints",
    supported: false,
    reason: "Pedro telemetry replay hints planned in REPLAY-01",
  },
  {
    operation: "simulationHooks",
    supported: false,
    reason: "Pedro simulation hooks planned in SIM-01",
  },
];

function pedroPresence(
  status: Awaited<ReturnType<typeof detectPedroStatus>>,
): AdapterDetectResult["presence"] {
  const depsPresent = status.dependencies.some((dep) => dep.present);
  if (status.pedroPathingPackagePresent && depsPresent && status.byalazarRepoPresent) {
    return "present";
  }
  if (status.pedroPathingPackagePresent || depsPresent || status.byalazarRepoPresent) {
    return "partial";
  }
  return "absent";
}

export class PedroPathingIntegrationAdapter implements IntegrationAdapter {
  readonly manifestId = "pedro-pathing";

  supportedOperations(): readonly AdapterOperationSupport[] {
    return PEDRO_OPERATIONS;
  }

  async detect(projectRoot: string): Promise<AdapterDetectResult> {
    const status = await detectPedroStatus(projectRoot);
    return {
      success: true,
      presence: pedroPresence(status),
      message: status.message,
      warnings: status.warnings,
      error: status.error,
      details: {
        status,
      },
    };
  }

  async validate(projectRoot: string): Promise<AdapterValidateResult> {
    const status = await detectPedroStatus(projectRoot);
    const checks = [
      {
        id: "project-layout",
        status: status.dependenciesPath ? ("pass" as const) : ("fail" as const),
        message: status.dependenciesPath
          ? "Official FTC build.dependencies.gradle found."
          : "build.dependencies.gradle not found.",
      },
      {
        id: "byalazar-repo",
        status: status.byalazarRepoPresent ? ("pass" as const) : ("fail" as const),
        message: status.byalazarRepoPresent
          ? "byalazar Maven repository configured."
          : "Missing byalazar Maven repository.",
      },
      {
        id: "compile-sdk",
        status: status.compileSdkOk ? ("pass" as const) : ("warn" as const),
        message: status.compileSdkOk
          ? "compileSdk meets Pedro minimum."
          : `compileSdk ${status.compileSdk ?? "unknown"} below Pedro minimum.`,
      },
      {
        id: "pedro-package",
        status: status.pedroPathingPackagePresent ? ("pass" as const) : ("warn" as const),
        message: status.pedroPathingPackagePresent
          ? "pedroPathing package present in TeamCode."
          : "pedroPathing package not scaffolded.",
      },
    ];

    const valid =
      checks.every((check) => check.status !== "fail") && pedroPresence(status) === "present";

    return {
      success: true,
      valid,
      message: status.message,
      warnings: status.warnings,
      checks,
    };
  }

  async install(
    projectRoot: string,
    options: IntegrationAdapterInstallOptions = {},
  ): Promise<AdapterInstallResult | AdapterUnsupportedResult> {
    if (!options.runner) {
      return unsupportedAdapterResult("install", "ProcessRunner required for Pedro install.");
    }

    const result = await addPedroPathing({
      projectRoot,
      runner: options.runner,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      dryRun: options.dryRun,
      yes: options.yes,
      force: options.force,
      version: options.version,
      patchCompileSdk: options.patchCompileSdk,
    });

    return {
      success: result.success,
      dryRun: result.dryRun,
      message: result.message,
      warnings: result.warnings,
      error: result.error,
      ftcVersion: result.ftcVersion,
      backupDirectory: result.backupDirectory,
      plan: result.plan.map((entry) => ({
        kind: entry.kind,
        description: entry.description,
        detail: entry.detail,
      })),
    };
  }

  async patch(
    projectRoot: string,
    options: IntegrationAdapterPatchOptions = {},
  ): Promise<AdapterPatchResult | AdapterUnsupportedResult> {
    return this.codegen(projectRoot, options);
  }

  async codegen(
    projectRoot: string,
    options: IntegrationAdapterCodegenOptions = {},
  ): Promise<AdapterCodegenResult | AdapterUnsupportedResult> {
    if (!options.runner) {
      return unsupportedAdapterResult("codegen", "ProcessRunner required for Pedro scaffold.");
    }

    const result = await scaffoldPedroPathing({
      projectRoot,
      runner: options.runner,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      dryRun: options.dryRun,
      yes: options.yes,
      force: options.force,
      tag: options.tag,
    });

    return {
      success: result.success,
      dryRun: result.dryRun,
      message: result.message,
      warnings: result.warnings,
      error: result.error,
      backupDirectory: result.backupDirectory,
      sourceTag: result.sourceTag,
      appliedPaths: result.appliedPaths,
      plan: result.plan.map((entry) => ({
        kind: entry.action,
        description: entry.relativePath,
        detail: entry.action,
      })),
    };
  }

  async replayHints(): Promise<AdapterReplayHintsResult | AdapterUnsupportedResult> {
    return unsupportedAdapterResult(
      "replayHints",
      "Pedro replay hints not implemented yet (REPLAY-01).",
    );
  }

  async simulationHooks(): Promise<AdapterSimulationHooksResult | AdapterUnsupportedResult> {
    return unsupportedAdapterResult(
      "simulationHooks",
      "Pedro simulation hooks not implemented yet (SIM-01).",
    );
  }
}

export const pedroPathingIntegrationAdapter = new PedroPathingIntegrationAdapter();
