import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BUILTIN_INTEGRATIONS } from "../src/registry/catalog.js";
import { BUILTIN_INTEGRATION_ADAPTERS } from "../src/registry/adapters/index.js";
import {
  createIntegrationRegistrySnapshot,
  getIntegration,
  getIntegrationAdapter,
  listIntegrationRegistryEntries,
  listIntegrationsWithCapability,
  listShippedIntegrations,
} from "../src/registry/registry.js";

describe("integration registry", () => {
  it("includes pedro-pathing as shipped integration", () => {
    const pedro = getIntegration("pedro-pathing");
    expect(pedro?.cliCommand).toBe("pedro");
    expect(pedro?.classification).toBe("supported");
  });

  it("lists shipped integrations with CLI commands", () => {
    const shipped = listShippedIntegrations();
    expect(shipped.map((entry) => entry.id)).toContain("pedro-pathing");
    expect(shipped.every((entry) => entry.cliCommand)).toBe(true);
  });

  it("filters by capability", () => {
    const vision = listIntegrationsWithCapability("vision");
    expect(vision.length).toBeGreaterThan(0);
    expect(vision.every((entry) => entry.capabilities.includes("vision"))).toBe(true);
  });

  it("creates stable snapshot shape with adapter descriptors", () => {
    const snapshot = createIntegrationRegistrySnapshot();
    expect(snapshot.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(snapshot.integrations).toHaveLength(BUILTIN_INTEGRATIONS.length);
    expect(snapshot.adapters).toHaveLength(BUILTIN_INTEGRATION_ADAPTERS.length);
    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses unique integration ids", () => {
    const ids = BUILTIN_INTEGRATIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registers Pedro adapter with core operations", () => {
    const adapter = getIntegrationAdapter("pedro-pathing");
    expect(adapter).toBeDefined();
    const ops = adapter!.supportedOperations().filter((entry) => entry.supported);
    expect(ops.map((entry) => entry.operation)).toEqual(
      expect.arrayContaining(["detect", "validate", "install", "codegen"]),
    );
  });

  it("marks adapter readiness on registry entries", () => {
    const pedro = listIntegrationRegistryEntries().find(
      (entry) => entry.manifestId === "pedro-pathing",
    );
    expect(pedro?.adapterRegistered).toBe(true);
    expect(pedro?.operations.some((entry) => entry.operation === "detect" && entry.supported)).toBe(
      true,
    );
  });
});

describe("integration adapters", () => {
  it("detects Pedro on sample FTC fixture", async () => {
    const adapter = getIntegrationAdapter("pedro-pathing");
    expect(adapter).toBeDefined();
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    const sampleProject = path.join(repoRoot, "examples/sample-ftc-project");
    const result = await adapter!.detect(sampleProject);
    expect(result.success).toBe(true);
    expect(["absent", "partial", "present"]).toContain(result.presence);
  });
});
