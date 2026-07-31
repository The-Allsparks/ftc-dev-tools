/**
 * Integration adapter contract (ADR-0010).
 * Behavioral operations beyond manifest metadata in the integration registry.
 */

import type { ProcessRunner } from "../types/process.js";
import type { FetchLike } from "../sdk/types.js";
import type { IntegrationManifest } from "./types.js";

/** Schema version for adapter registry snapshots. */
export const INTEGRATION_ADAPTER_SCHEMA_VERSION = "1.0.0";

export type AdapterOperation =
  "detect" | "validate" | "install" | "patch" | "codegen" | "replayHints" | "simulationHooks";

export type AdapterPresence = "absent" | "partial" | "present";

export interface AdapterOperationSupport {
  operation: AdapterOperation;
  supported: boolean;
  reason?: string;
}

export interface IntegrationAdapterContext {
  runner?: ProcessRunner;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}

export interface IntegrationAdapterInstallOptions extends IntegrationAdapterContext {
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

export interface IntegrationAdapterPatchOptions extends IntegrationAdapterContext {
  dryRun?: boolean;
  yes?: boolean;
}

export interface IntegrationAdapterCodegenOptions extends IntegrationAdapterContext {
  dryRun?: boolean;
  yes?: boolean;
}

export interface AdapterResultBase {
  success: boolean;
  message: string;
  warnings: string[];
}

export interface AdapterUnsupportedResult extends AdapterResultBase {
  success: false;
  unsupported: true;
  operation: AdapterOperation;
}

export interface AdapterDetectResult extends AdapterResultBase {
  presence: AdapterPresence;
  details?: Record<string, unknown>;
}

export interface AdapterValidateResult extends AdapterResultBase {
  valid: boolean;
  checks: AdapterValidationCheck[];
}

export interface AdapterValidationCheck {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface AdapterInstallResult extends AdapterResultBase {
  dryRun: boolean;
  plan: readonly AdapterPlanEntry[];
}

export interface AdapterPatchResult extends AdapterResultBase {
  dryRun: boolean;
  plan: readonly AdapterPlanEntry[];
}

export interface AdapterCodegenResult extends AdapterResultBase {
  dryRun: boolean;
  plan: readonly AdapterPlanEntry[];
}

export interface AdapterPlanEntry {
  kind: string;
  description: string;
  detail?: string;
}

export interface AdapterReplayHintsResult extends AdapterResultBase {
  hints: readonly AdapterReplayHint[];
}

export interface AdapterReplayHint {
  sourceId: string;
  recordClass: "observation" | "hypothesis";
  description: string;
}

export interface AdapterSimulationHooksResult extends AdapterResultBase {
  hooks: readonly AdapterSimulationHook[];
}

export interface AdapterSimulationHook {
  runtimeId: string;
  description: string;
}

export type AdapterOperationResult =
  | AdapterDetectResult
  | AdapterValidateResult
  | AdapterInstallResult
  | AdapterPatchResult
  | AdapterCodegenResult
  | AdapterReplayHintsResult
  | AdapterSimulationHooksResult
  | AdapterUnsupportedResult;

export interface IntegrationAdapter {
  readonly manifestId: string;
  supportedOperations(): readonly AdapterOperationSupport[];
  detect(projectRoot: string): Promise<AdapterDetectResult>;
  validate(projectRoot: string): Promise<AdapterValidateResult>;
  install(
    projectRoot: string,
    options?: IntegrationAdapterInstallOptions,
  ): Promise<AdapterInstallResult | AdapterUnsupportedResult>;
  patch(
    projectRoot: string,
    options?: IntegrationAdapterPatchOptions,
  ): Promise<AdapterPatchResult | AdapterUnsupportedResult>;
  codegen(
    projectRoot: string,
    options?: IntegrationAdapterCodegenOptions,
  ): Promise<AdapterCodegenResult | AdapterUnsupportedResult>;
  replayHints(projectRoot: string): Promise<AdapterReplayHintsResult | AdapterUnsupportedResult>;
  simulationHooks(
    projectRoot: string,
  ): Promise<AdapterSimulationHooksResult | AdapterUnsupportedResult>;
}

export interface IntegrationAdapterDescriptor {
  manifestId: string;
  displayName: string;
  operations: readonly AdapterOperationSupport[];
}

export interface IntegrationRegistryEntry extends IntegrationAdapterDescriptor {
  manifest: IntegrationManifest;
  adapterRegistered: boolean;
}

export interface IntegrationRegistrySnapshot {
  schemaVersion: string;
  generatedAt: string;
  integrations: IntegrationManifest[];
  adapters: IntegrationAdapterDescriptor[];
}

export function isAdapterUnsupportedResult(
  result: AdapterOperationResult,
): result is AdapterUnsupportedResult {
  return "unsupported" in result && result.unsupported === true;
}

export function unsupportedAdapterResult(
  operation: AdapterOperation,
  reason: string,
): AdapterUnsupportedResult {
  return {
    success: false,
    unsupported: true,
    operation,
    message: reason,
    warnings: [],
  };
}
