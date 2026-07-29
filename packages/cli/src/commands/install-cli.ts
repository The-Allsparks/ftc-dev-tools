import type { Command } from "commander";
import {
  buildCliInstallFromLatestGitHubRelease,
  buildCliInstallFromGitHubRelease,
  PACKAGE_VERSION,
} from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";

export function registerInstallCliCommand(program: Command): void {
  program
    .command("install-cli")
    .description("Print the npm global install command for the latest GitHub Release CLI tarball")
    .option("--json", "Emit { version, tagName, tarballUrl, installCommand }")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext(process.cwd(), false);
      try {
        const resolved = await buildCliInstallFromLatestGitHubRelease({
          platform: process.platform,
        });
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                version: resolved.release.version,
                tagName: resolved.release.tagName,
                tarballUrl: resolved.release.tarballUrl,
                assetName: resolved.release.assetName,
                installCommand: resolved.installCommand,
              },
              null,
              2,
            ),
          );
          return;
        }
        ctx.logger.info(
          `Latest release: ${resolved.release.tagName} (${resolved.release.assetName})`,
        );
        console.log(resolved.installCommand);
      } catch (error) {
        const fallback = buildCliInstallFromGitHubRelease(PACKAGE_VERSION, process.platform);
        const message = error instanceof Error ? error.message : String(error);
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                version: PACKAGE_VERSION,
                installCommand: fallback,
                fallback: true,
                error: message,
              },
              null,
              2,
            ),
          );
          return;
        }
        ctx.logger.warn(`Could not resolve latest release (${message}). Bundled version fallback:`);
        console.log(fallback);
      }
    });
}
