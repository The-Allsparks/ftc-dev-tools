import { BUILTIN_INTEGRATIONS } from "./catalog.js";
import {
  INTEGRATION_MANIFEST_SCHEMA_VERSION,
  type IntegrationCapability,
  type IntegrationCategory,
  type IntegrationManifest,
  type IntegrationRegistrySnapshot,
  type EcosystemClassification,
} from "./types.js";

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

export function createIntegrationRegistrySnapshot(): IntegrationRegistrySnapshot {
  return {
    schemaVersion: INTEGRATION_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    integrations: [...BUILTIN_INTEGRATIONS],
  };
}
