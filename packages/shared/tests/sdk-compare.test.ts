import { describe, expect, it } from "vitest";
import { compareVersions, normalizeVersion, parseVersion } from "../src/sdk/compare-versions.js";

describe("compare-versions", () => {
  it("normalizes v-prefix", () => {
    expect(normalizeVersion("v11.2")).toBe("11.2");
    expect(normalizeVersion("11.2.0")).toBe("11.2.0");
  });

  it("parses major.minor.patch with defaults", () => {
    expect(parseVersion("v11.2")).toEqual({
      major: 11,
      minor: 2,
      patch: 0,
      raw: "11.2",
    });
    expect(parseVersion("10.1.1")).toEqual({
      major: 10,
      minor: 1,
      patch: 1,
      raw: "10.1.1",
    });
  });

  it("compares 11.1.0 behind v11.2", () => {
    expect(compareVersions("11.1.0", "v11.2")).toBeLessThan(0);
    expect(compareVersions("11.2.0", "11.2")).toBe(0);
    expect(compareVersions("11.3", "11.2.0")).toBeGreaterThan(0);
  });
});
