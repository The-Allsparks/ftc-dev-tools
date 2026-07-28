import { describe, expect, it } from "vitest";
import {
  NPM_INSTALL_CLI_COMMAND,
  NPM_INSTALL_MCP_COMMAND,
  PACKAGE_VERSION,
  buildCliInstallFromGitHubRelease,
  buildCliInstallFromNpm,
  buildMcpInstallFromNpm,
  buildMcpRunViaNpx,
  cliGitHubReleaseTarballUrl,
  cliReleaseTarballBasename,
  listCliConsumerInstallCommands,
  releaseTagForVersion,
} from "../src/index.js";

describe("cli-consumer-install", () => {
  it("builds release tag and tarball names from PACKAGE_VERSION", () => {
    expect(releaseTagForVersion(PACKAGE_VERSION)).toBe(`v${PACKAGE_VERSION}`);
    expect(cliReleaseTarballBasename(PACKAGE_VERSION)).toBe(`ftc-cli-${PACKAGE_VERSION}.tar.gz`);
  });

  it("builds GitHub release tarball URL", () => {
    expect(cliGitHubReleaseTarballUrl("0.1.0")).toBe(
      "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz",
    );
  });

  it("builds copy-ready install commands", () => {
    expect(buildCliInstallFromNpm()).toBe(NPM_INSTALL_CLI_COMMAND);
    expect(buildCliInstallFromGitHubRelease("0.1.0")).toBe(
      'npm install -g "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz"',
    );
    expect(buildMcpInstallFromNpm()).toBe(NPM_INSTALL_MCP_COMMAND);
    expect(buildMcpRunViaNpx()).toContain("@ftc-dev-tools/mcp");
  });

  it("lists consumer install options with github-release first", () => {
    const options = listCliConsumerInstallCommands();
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0]?.method).toBe("github-release");
    expect(options.some((o) => o.method === "npm")).toBe(true);
  });
});
