import type { IntegrationCapability } from "../registry/types.js";

/** Schema version for module manifest documents. */
export const MODULE_MANIFEST_SCHEMA_VERSION = "1.0.0";

export type ModuleLayer = "core" | "capability" | "workflow" | "adapter";

/** Canonical module layers for registry filtering across CLI and MCP surfaces. */
export const MODULE_LAYERS = [
  "core",
  "capability",
  "workflow",
  "adapter",
] as const satisfies readonly ModuleLayer[];

export function isModuleLayer(value: string): value is ModuleLayer {
  return (MODULE_LAYERS as readonly string[]).includes(value);
}

export interface ModuleManifest {
  schemaVersion: typeof MODULE_MANIFEST_SCHEMA_VERSION;
  id: string;
  displayName: string;
  layer: ModuleLayer;
  summary: string;
  dependsOn?: readonly string[];
  provides?: readonly IntegrationCapability[];
  experimental?: boolean;
  deprecated?: boolean;
  /** GitHub epic issue number when filed */
  epicIssue?: number;
}

export interface ModuleRegistrySnapshot {
  schemaVersion: string;
  generatedAt: string;
  modules: ModuleManifest[];
}
