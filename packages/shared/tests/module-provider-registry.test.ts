import { describe, expect, it, beforeEach } from "vitest";
import { BUILTIN_MODULES } from "../src/modules/catalog.js";
import {
  createModuleRegistrySnapshot,
  getModule,
  listModulesByLayer,
} from "../src/modules/registry.js";

describe("module registry", () => {
  it("includes vision-lab capability module", () => {
    const vision = getModule("vision-lab");
    expect(vision?.layer).toBe("capability");
    expect(vision?.epicIssue).toBe(48);
  });

  it("lists modules by layer", () => {
    const capabilities = listModulesByLayer("capability");
    expect(capabilities.length).toBeGreaterThanOrEqual(5);
    expect(capabilities.every((entry) => entry.layer === "capability")).toBe(true);
  });

  it("creates stable snapshot shape", () => {
    const snapshot = createModuleRegistrySnapshot();
    expect(snapshot.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(snapshot.modules).toHaveLength(BUILTIN_MODULES.length);
  });
});

describe("provider registry", () => {
  beforeEach(async () => {
    const { resetProviderCatalogForTests } = await import("../src/providers/bootstrap.js");
    resetProviderCatalogForTests();
  });

  it("bootstraps vision providers linked to frame providers", async () => {
    const { createProviderRegistrySnapshot } = await import("../src/providers/bootstrap.js");
    const { getFrameProvider } = await import("../src/providers/frame-registry.js");
    const snapshot = createProviderRegistrySnapshot();
    const limelight = snapshot.visionProviders.find((entry) => entry.id === "vision:limelight");
    expect(limelight?.frameProviderId).toBe("frame:limelight");
    expect(getFrameProvider("frame:limelight")).toBeDefined();
  });

  it("is idempotent on repeated bootstrap", async () => {
    const { bootstrapProviderCatalog, createProviderRegistrySnapshot } =
      await import("../src/providers/bootstrap.js");
    bootstrapProviderCatalog();
    const first = createProviderRegistrySnapshot();
    bootstrapProviderCatalog();
    const second = createProviderRegistrySnapshot();
    expect(second.frameProviders).toHaveLength(first.frameProviders.length);
  });
});
