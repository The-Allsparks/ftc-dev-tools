/**
 * Helpers for routing CLI/MCP Pedro commands through IntegrationAdapter (ADR-0010 §7).
 */

import path from "node:path";
import type {
  AdapterCodegenResult,
  AdapterDetectResult,
  AdapterInstallResult,
  AdapterUnsupportedResult,
  IntegrationAdapter,
} from "../adapter-types.js";
import { isAdapterUnsupportedResult } from "../adapter-types.js";
import type {
  PedroAddPlanEntry,
  PedroAddResult,
  PedroScaffoldPlanEntry,
  PedroScaffoldResult,
  PedroStatusReport,
} from "../../pedro/types.js";
import { getIntegrationAdapter } from "../registry.js";

export const PEDRO_PATHING_MANIFEST_ID = "pedro-pathing";

export function getPedroIntegrationAdapter(): IntegrationAdapter {
  const adapter = getIntegrationAdapter(PEDRO_PATHING_MANIFEST_ID);
  if (!adapter) {
    throw new Error("Pedro Pathing integration adapter is not registered.");
  }
  return adapter;
}

export function pedroStatusFromDetect(
  projectRoot: string,
  result: AdapterDetectResult,
): PedroStatusReport {
  const status = result.details?.status as PedroStatusReport | undefined;
  if (status) {
    return { ...status, projectRoot: path.resolve(projectRoot) };
  }
  return {
    projectRoot: path.resolve(projectRoot),
    pedroPathingPackagePresent: false,
    byalazarRepoPresent: false,
    dependencies: [],
    compileSdkOk: false,
    message: result.message,
    warnings: result.warnings,
    generatedAt: new Date().toISOString(),
    error: result.error,
  };
}

export function pedroAddFromInstall(
  result: AdapterInstallResult | AdapterUnsupportedResult,
): PedroAddResult {
  if (isAdapterUnsupportedResult(result)) {
    return {
      success: false,
      dryRun: false,
      plan: [],
      message: result.message,
      warnings: result.warnings,
      error: result.error,
    };
  }
  return {
    success: result.success,
    dryRun: result.dryRun,
    message: result.message,
    warnings: result.warnings,
    error: result.error,
    ftcVersion: result.ftcVersion,
    backupDirectory: result.backupDirectory,
    plan: result.plan.map((entry): PedroAddPlanEntry => ({
      kind: entry.kind as PedroAddPlanEntry["kind"],
      description: entry.description,
      detail: entry.detail,
    })),
  };
}

export function pedroScaffoldFromCodegen(
  result: AdapterCodegenResult | AdapterUnsupportedResult,
): PedroScaffoldResult {
  if (isAdapterUnsupportedResult(result)) {
    return {
      success: false,
      dryRun: false,
      plan: [],
      appliedPaths: [],
      message: result.message,
      warnings: result.warnings,
      error: result.error,
    };
  }
  return {
    success: result.success,
    dryRun: result.dryRun,
    message: result.message,
    warnings: result.warnings,
    error: result.error,
    backupDirectory: result.backupDirectory,
    sourceTag: result.sourceTag,
    appliedPaths: result.appliedPaths ? [...result.appliedPaths] : [],
    plan: result.plan.map((entry): PedroScaffoldPlanEntry => ({
      relativePath: entry.description,
      action: (entry.detail ?? entry.kind) as PedroScaffoldPlanEntry["action"],
    })),
  };
}
