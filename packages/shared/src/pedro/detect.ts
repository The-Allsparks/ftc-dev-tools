import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectAdapter } from "../adapters/resolve-project-adapter.js";
import {
  PEDRO_FTC_COORD,
  PEDRO_FULLPANELS_COORD,
  PEDRO_MIN_COMPILE_SDK,
  PEDRO_TELEMETRY_COORD,
} from "./defaults.js";
import { findCompileSdk, hasByalazarRepo, parseGradleDependencies } from "./gradle-patch.js";
import type { PedroDependencyInfo, PedroStatusReport } from "./types.js";
import type { ProjectAdapter } from "../types/project.js";

export interface DetectPedroStatusOptions {
  adapter?: ProjectAdapter;
}

export async function detectPedroStatus(
  projectRoot: string,
  options?: DetectPedroStatusOptions,
): Promise<PedroStatusReport> {
  const generatedAt = new Date().toISOString();
  const root = path.resolve(projectRoot);
  const warnings: string[] = [];
  const adapter = resolveProjectAdapter(options?.adapter);
  const info = await adapter.inspect(root);

  if (info.kind === "unknown") {
    return {
      projectRoot: root,
      pedroPathingPackagePresent: false,
      byalazarRepoPresent: false,
      dependencies: [],
      compileSdkOk: false,
      message: "Not an official FTC project layout; cannot detect Pedro Pathing.",
      warnings,
      generatedAt,
    };
  }

  const dependenciesPath = path.join(root, "build.dependencies.gradle");
  let depsText = "";
  let dependenciesPathExists = false;
  try {
    depsText = await fs.readFile(dependenciesPath, "utf8");
    dependenciesPathExists = true;
  } catch {
    warnings.push("build.dependencies.gradle not found.");
  }

  const parsed = dependenciesPathExists ? parseGradleDependencies(depsText) : [];
  const byCoord = new Map(parsed.map((d) => [`${d.group}:${d.name}`, d]));
  const dependencies: PedroDependencyInfo[] = [
    PEDRO_FTC_COORD,
    PEDRO_TELEMETRY_COORD,
    PEDRO_FULLPANELS_COORD,
  ].map((coord) => {
    const hit = byCoord.get(coord);
    const [group, name] = coord.split(":");
    return hit ?? { group: group!, name: name!, version: "", present: false };
  });

  const ftcVersion = byCoord.get(PEDRO_FTC_COORD)?.version;
  const byalazarRepoPresent = dependenciesPathExists && hasByalazarRepo(depsText);

  const compileSdk = await detectCompileSdk(root);
  const compileSdkOk = compileSdk === undefined || compileSdk >= PEDRO_MIN_COMPILE_SDK;
  if (compileSdk !== undefined && !compileSdkOk) {
    warnings.push(
      `compileSdk is ${compileSdk}; Pedro Pathing docs recommend ${PEDRO_MIN_COMPILE_SDK}+.`,
    );
  }

  const pkg = await findPedroPathingPackage(info.teamCodeSourcePath);
  const missingDeps = dependencies.filter((d) => !d.present).map((d) => `${d.group}:${d.name}`);

  let message: string;
  if (ftcVersion && pkg.present && byalazarRepoPresent) {
    message = `Pedro Pathing present (ftc ${ftcVersion}${pkg.path ? `; package at ${pkg.path}` : ""}).`;
  } else if (ftcVersion || pkg.present) {
    message = `Pedro Pathing partially configured.${missingDeps.length ? ` Missing deps: ${missingDeps.join(", ")}.` : ""}`;
  } else {
    message = "Pedro Pathing not detected. Run `ftc pedro add` then `ftc pedro scaffold`.";
  }

  return {
    projectRoot: root,
    dependenciesPath: dependenciesPathExists ? dependenciesPath : undefined,
    teamCodeSourcePath: info.teamCodeSourcePath,
    pedroPathingPackagePresent: pkg.present,
    pedroPathingPackagePath: pkg.path,
    byalazarRepoPresent,
    dependencies,
    ftcVersion,
    compileSdk,
    compileSdkOk,
    message,
    warnings,
    generatedAt,
  };
}

async function detectCompileSdk(projectRoot: string): Promise<number | undefined> {
  const candidates = [
    path.join(projectRoot, "build.common.gradle"),
    path.join(projectRoot, "TeamCode", "build.gradle"),
    path.join(projectRoot, "FtcRobotController", "build.gradle"),
    path.join(projectRoot, "build.gradle"),
  ];
  for (const file of candidates) {
    try {
      const text = await fs.readFile(file, "utf8");
      const sdk = findCompileSdk(text);
      if (sdk !== undefined) {
        return sdk;
      }
    } catch {
      // continue
    }
  }
  return undefined;
}

async function findPedroPathingPackage(
  teamCodeSourcePath?: string,
): Promise<{ present: boolean; path?: string }> {
  if (!teamCodeSourcePath) {
    return { present: false };
  }
  const hit = await walkForDirNamed(teamCodeSourcePath, "pedroPathing");
  return hit ? { present: true, path: hit } : { present: false };
}

async function walkForDirNamed(dir: string, name: string): Promise<string | undefined> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.name === name) {
      return full;
    }
    const nested = await walkForDirNamed(full, name);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}
