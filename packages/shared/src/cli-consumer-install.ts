import { PACKAGE_VERSION } from "./constants.js";

export const FTC_DEV_TOOLS_GITHUB_OWNER = "The-Allsparks";
export const FTC_DEV_TOOLS_GITHUB_REPO = "ftc-dev-tools";

export const FTC_DEV_TOOLS_RELEASES_PAGE_URL = `https://github.com/${FTC_DEV_TOOLS_GITHUB_OWNER}/${FTC_DEV_TOOLS_GITHUB_REPO}/releases`;

export const NPM_PACKAGE_CLI = "@ftc-dev-tools/cli";
export const NPM_PACKAGE_MCP = "@ftc-dev-tools/mcp";

export const NPM_INSTALL_CLI_COMMAND = `npm install -g ${NPM_PACKAGE_CLI}`;
export const NPM_INSTALL_MCP_COMMAND = `npm install -g ${NPM_PACKAGE_MCP}`;

/** Git tag for a release (matches release workflow `v*` tags). */
export function releaseTagForVersion(version: string = PACKAGE_VERSION): string {
  return version.startsWith("v") ? version : `v${version}`;
}

/** Basename of the CLI tarball attached to GitHub Releases. */
export function cliReleaseTarballBasename(version: string = PACKAGE_VERSION): string {
  return `ftc-cli-${version}.tar.gz`;
}

/** Direct download URL for the CLI tarball on a tagged GitHub Release. */
export function cliGitHubReleaseTarballUrl(version: string = PACKAGE_VERSION): string {
  const tag = releaseTagForVersion(version);
  const asset = cliReleaseTarballBasename(version);
  return `https://github.com/${FTC_DEV_TOOLS_GITHUB_OWNER}/${FTC_DEV_TOOLS_GITHUB_REPO}/releases/download/${tag}/${asset}`;
}

/** One global install command from the latest published GitHub Release asset (Node + network; no git clone). */
export function buildCliInstallFromGitHubRelease(version: string = PACKAGE_VERSION): string {
  const url = cliGitHubReleaseTarballUrl(version);
  return `npm install -g "${url}"`;
}

/** When `@ftc-dev-tools/cli` is published to npm (requires maintainer NPM_TOKEN). */
export function buildCliInstallFromNpm(): string {
  return NPM_INSTALL_CLI_COMMAND;
}

/** Recommended global install for MCP once published to npm. */
export function buildMcpInstallFromNpm(): string {
  return NPM_INSTALL_MCP_COMMAND;
}

/**
 * Run MCP via npx without a global install (after npm publish).
 * Prefer a global install for Cursor configs that need a stable binary path.
 */
export function buildMcpRunViaNpx(): string {
  return `npx -y ${NPM_PACKAGE_MCP}`;
}

export type ConsumerInstallMethod = "github-release" | "npm";

export interface ConsumerInstallCommand {
  method: ConsumerInstallMethod;
  label: string;
  command: string;
  notes?: string;
}

/** Copy-ready install options for docs and the VS Code extension preview. */
export function listCliConsumerInstallCommands(
  version: string = PACKAGE_VERSION,
): ConsumerInstallCommand[] {
  return [
    {
      method: "github-release",
      label: "GitHub Release (supported for 0.1.0)",
      command: buildCliInstallFromGitHubRelease(version),
      notes:
        "Requires Node.js 20+, network access, and an published release tag (for example v0.1.0). No git clone.",
    },
    {
      method: "npm",
      label: "npm registry (when published)",
      command: buildCliInstallFromNpm(),
      notes: "Available after maintainers publish @ftc-dev-tools/cli to npm.",
    },
  ];
}
