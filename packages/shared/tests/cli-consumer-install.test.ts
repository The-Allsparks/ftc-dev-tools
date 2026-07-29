import { describe, expect, it } from "vitest";
import {
  NPM_INSTALL_CLI_COMMAND,
  NPM_INSTALL_MCP_COMMAND,
  PACKAGE_VERSION,
  buildCliInstallFromGitHubRelease,
  buildCliInstallFromNpm,
  buildMcpInstallFromNpm,
  buildMcpRunViaNpx,
  buildNpmGlobalInstallCommand,
  cliGitHubReleaseTarballUrl,
  cliReleaseTarballBasename,
  listCliConsumerInstallCommands,
  npmCliExecutable,
  npxCliExecutable,
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

  it("selects npm/npx executable for platform", () => {
    expect(npmCliExecutable("linux")).toBe("npm");
    expect(npmCliExecutable("darwin")).toBe("npm");
    expect(npmCliExecutable("win32")).toBe("npm.cmd");
    expect(npxCliExecutable("win32")).toBe("npx.cmd");
  });

  it("builds copy-ready install commands", () => {
    expect(buildCliInstallFromNpm("linux")).toBe(NPM_INSTALL_CLI_COMMAND);
    expect(buildCliInstallFromNpm("win32")).toBe("npm.cmd install -g @ftc-dev-tools/cli");
    expect(buildCliInstallFromGitHubRelease("0.1.0", "linux")).toBe(
      'npm install -g "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz"',
    );
    expect(buildCliInstallFromGitHubRelease("0.1.0", "win32")).toBe(
      'npm.cmd install -g "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz"',
    );
    expect(buildMcpInstallFromNpm("linux")).toBe(NPM_INSTALL_MCP_COMMAND);
    expect(buildMcpInstallFromNpm("win32")).toBe("npm.cmd install -g @ftc-dev-tools/mcp");
    expect(buildMcpRunViaNpx("linux")).toContain("@ftc-dev-tools/mcp");
    expect(buildMcpRunViaNpx("win32")).toBe("npx.cmd -y @ftc-dev-tools/mcp");
    expect(buildNpmGlobalInstallCommand("@ftc-dev-tools/cli", "win32")).toBe(
      "npm.cmd install -g @ftc-dev-tools/cli",
    );
  });

  it("lists consumer install options with github-release first", () => {
    const options = listCliConsumerInstallCommands();
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0]?.method).toBe("github-release");
    expect(options.some((o) => o.method === "npm")).toBe(true);
  });

  it("uses npm.cmd in listed commands on Windows", () => {
    const options = listCliConsumerInstallCommands(PACKAGE_VERSION, "win32");
    expect(options[0]?.command.startsWith("npm.cmd install -g")).toBe(true);
    expect(options[0]?.notes).toContain("npm.cmd");
  });
});
