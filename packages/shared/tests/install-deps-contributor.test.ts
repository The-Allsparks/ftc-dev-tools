import { describe, expect, it } from "vitest";
import { buildContributorInstallDepsCommand } from "../src/setup/install-deps-contributor.js";

describe("install-deps-contributor", () => {
  it("builds repo-local windows command with skip flags", () => {
    const cmd = buildContributorInstallDepsCommand(
      "windows",
      { skipJdk: true },
      "C:\\dev\\ftc-dev-tools",
    );
    expect(cmd).toContain("install-deps-windows.ps1");
    expect(cmd).toContain("-SkipJdk");
  });
});
