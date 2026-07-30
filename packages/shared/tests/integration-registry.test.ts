import { describe, expect, it } from "vitest";
import { BUILTIN_INTEGRATIONS } from "../src/registry/catalog.js";
import {
  createIntegrationRegistrySnapshot,
  getIntegration,
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

  it("creates stable snapshot shape", () => {
    const snapshot = createIntegrationRegistrySnapshot();
    expect(snapshot.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(snapshot.integrations).toHaveLength(BUILTIN_INTEGRATIONS.length);
    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses unique integration ids", () => {
    const ids = BUILTIN_INTEGRATIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
