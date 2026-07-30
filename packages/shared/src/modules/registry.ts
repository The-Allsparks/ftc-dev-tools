import { BUILTIN_MODULES } from "./catalog.js";
import {
  MODULE_MANIFEST_SCHEMA_VERSION,
  type ModuleLayer,
  type ModuleManifest,
  type ModuleRegistrySnapshot,
} from "./types.js";

export function listModules(): readonly ModuleManifest[] {
  return BUILTIN_MODULES;
}

export function getModule(id: string): ModuleManifest | undefined {
  return BUILTIN_MODULES.find((entry) => entry.id === id);
}

export function listModulesByLayer(layer: ModuleLayer): readonly ModuleManifest[] {
  return BUILTIN_MODULES.filter((entry) => entry.layer === layer);
}

export function createModuleRegistrySnapshot(): ModuleRegistrySnapshot {
  return {
    schemaVersion: MODULE_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    modules: [...BUILTIN_MODULES],
  };
}
