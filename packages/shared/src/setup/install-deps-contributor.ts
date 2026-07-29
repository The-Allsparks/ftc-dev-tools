import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildInstallDepsCommand,
  type BuildInstallDepsOptions,
  type InstallDepsOs,
} from "../install-deps-urls.js";

export function findFtcDevToolsRepoRoot(startDir: string): string | undefined {
  const tryRoot = (dir: string): string | undefined => {
    let current = path.resolve(dir);
    for (let depth = 0; depth < 10; depth++) {
      const marker = path.join(current, "scripts", "install-deps-windows.ps1");
      const pkgPath = path.join(current, "package.json");
      if (fs.existsSync(marker) && fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
          if (pkg.name === "ftc-dev-tools") {
            return current;
          }
        } catch {
          // ignore
        }
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
    return undefined;
  };

  const fromStart = tryRoot(startDir);
  if (fromStart) {
    return fromStart;
  }

  const wellKnown = path.join(os.homedir(), "Documents", "The Allsparks", "ftc-dev-tools");
  if (wellKnown !== path.resolve(startDir)) {
    return tryRoot(wellKnown);
  }

  return undefined;
}

export function buildContributorInstallDepsCommand(
  os: InstallDepsOs,
  options: BuildInstallDepsOptions,
  repoRoot: string,
): string {
  const q = (p: string) => (process.platform === "win32" ? `"${p.replace(/"/g, '`"')}"` : `"${p}"`);
  const root = q(repoRoot);

  switch (os) {
    case "windows": {
      const flags: string[] = [];
      if (options.skipJdk) {
        flags.push("-SkipJdk");
      }
      if (options.skipSdk) {
        flags.push("-SkipSdk");
      }
      const suffix = flags.length > 0 ? ` ${flags.join(" ")}` : "";
      return `Set-Location ${root}; powershell -ExecutionPolicy Bypass -File .\\scripts\\install-deps-windows.ps1${suffix}`;
    }
    case "macos": {
      const env: string[] = [];
      if (options.skipJdk) {
        env.push("SKIP_JDK=1");
      }
      if (options.skipSdk) {
        env.push("SKIP_SDK=1");
      }
      const prefix = env.length > 0 ? `${env.join(" ")} ` : "";
      return `cd ${root} && ${prefix}bash ./scripts/install-deps-macos.sh`;
    }
    case "linux": {
      const env: string[] = [];
      if (options.skipJdk) {
        env.push("SKIP_JDK=1");
      }
      if (options.skipSdk) {
        env.push("SKIP_SDK=1");
      }
      const prefix = env.length > 0 ? `${env.join(" ")} ` : "";
      return `cd ${root} && ${prefix}bash ./scripts/install-deps-linux.sh`;
    }
  }
}

/** VSIX one-liner or cloned-repo script, whichever applies. */
export function buildInstallDepsTerminalCommand(
  os: InstallDepsOs,
  options: BuildInstallDepsOptions,
  cwd: string,
): string {
  const repo = findFtcDevToolsRepoRoot(cwd);
  if (repo) {
    return buildContributorInstallDepsCommand(os, options, repo);
  }
  return buildInstallDepsCommand(os, options);
}
