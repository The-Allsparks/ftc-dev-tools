import fs from "node:fs";
import path from "node:path";
import {
  buildInstallDepsCommand,
  type BuildInstallDepsOptions,
  type InstallDepsOs,
} from "../install-deps-urls.js";

export function findFtcDevToolsRepoRoot(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 10; depth++) {
    const marker = path.join(dir, "scripts", "install-deps-windows.ps1");
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(marker) && fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "ftc-dev-tools") {
          return dir;
        }
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
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
