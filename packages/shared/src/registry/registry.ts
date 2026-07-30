import { BUILTIN_INTEGRATIONS } from "./catalog.js";
import { BUILTIN_INTEGRATION_ADAPTERS } from "./adapters/index.js";
import type {
  IntegrationAdapter,
  IntegrationAdapterDescriptor,
  IntegrationRegistryEntry,
  IntegrationRegistrySnapshot,
} from "./adapter-types.js";
import { INTEGRATION_ADAPTER_SCHEMA_VERSION } from "./adapter-types.js";
import type {
  IntegrationCapability,
  IntegrationCategory,
  IntegrationManifest,
  EcosystemClassification,
} from "./types.js";

export function listIntegrationAdapters(): readonly IntegrationAdapter[] {
  return BUILTIN_INTEGRATION_ADAPTERS;
}

export function getIntegrationAdapter(manifestId: string): IntegrationAdapter | undefined {
  return BUILTIN_INTEGRATION_ADAPTERS.find((adapter) => adapter.manifestId === manifestId);
}

export function createIntegrationAdapterDescriptor(
  adapter: IntegrationAdapter,
): IntegrationAdapterDescriptor {
  const manifest = getIntegration(adapter.manifestId);
  return {
    manifestId: adapter.manifestId,
    displayName: manifest?.displayName ?? adapter.manifestId,
    operations: adapter.supportedOperations(),
  };
}

export function listIntegrationRegistryEntries(): readonly IntegrationRegistryEntry[] {
  return BUILTIN_INTEGRATIONS.map((manifest) => {
    const adapter = getIntegrationAdapter(manifest.id);
    const operations = adapter?.supportedOperations() ?? [];
    return {
      manifestId: manifest.id,
      displayName: manifest.displayName,
      operations,
      manifest,
      adapterRegistered: adapter !== undefined,
    };
  });
}

export function createIntegrationRegistrySnapshot(): IntegrationRegistrySnapshot {
  return {
    schemaVersion: INTEGRATION_ADAPTER_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    integrations: [...BUILTIN_INTEGRATIONS],
    adapters: BUILTIN_INTEGRATION_ADAPTERS.map(createIntegrationAdapterDescriptor),
  };
}

export function listIntegrations(): readonly IntegrationManifest[] {
  return BUILTIN_INTEGRATIONS;
}

export function getIntegration(id: string): IntegrationManifest | undefined {
  return BUILTIN_INTEGRATIONS.find((entry) => entry.id === id);
}

export function listIntegrationsByCategory(
  category: IntegrationCategory,
): readonly IntegrationManifest[] {
  return BUILTIN_INTEGRATIONS.filter((entry) => entry.category === category);
}

export function listIntegrationsByClassification(
  classification: EcosystemClassification,
): readonly IntegrationManifest[] {
  return BUILTIN_INTEGRATIONS.filter((entry) => entry.classification === classification);
}

export function listIntegrationsWithCapability(
  capability: IntegrationCapability,
): readonly IntegrationManifest[] {
  return BUILTIN_INTEGRATIONS.filter((entry) => entry.capabilities.includes(capability));
}

export function listShippedIntegrations(): readonly IntegrationManifest[] {
  return BUILTIN_INTEGRATIONS.filter((entry) => entry.cliCommand !== undefined);
}
