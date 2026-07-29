import path from "node:path";
import {
  formatJsonFile,
  mergeExtensionsJson,
  mergeFtcWorkspaceSettings,
  parseJsonStrict,
  buildFtcProjectTasksDocument,
  type FtcProjectTasksMode,
} from "./project-setup-files.js";

const FTC_DEV_SCHEMA =
  "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/ftc-dev.schema.json";

/** Default `.ftc-dev.json` document for project setup (no device serial fields). */
export function buildDefaultFtcDevJsonDocument(): Record<string, unknown> {
  return {
    $schema: FTC_DEV_SCHEMA,
    module: "TeamCode",
    deployment: {
      preferredConnection: "any",
    },
    logs: {
      defaultFilter: "teamcode",
    },
  };
}

export interface FtcProjectSetupPlan {
  path: string;
  content: string;
  description: string;
}

export interface BuildFtcProjectSetupPlansInput {
  projectRoot: string;
  tasksMode: FtcProjectTasksMode;
  /** `null` when the file does not exist; otherwise raw file contents. */
  ftcDevJson: string | null;
  extensionsJson: string | null;
  settingsJson: string | null;
  tasksJson: string | null;
  cliOnPath: boolean;
}

export type BuildFtcProjectSetupPlansResult =
  { ok: true; plans: FtcProjectSetupPlan[] } | { ok: false; invalidPath: string; error: string };

function parseExistingOrEmpty(
  filePath: string,
  raw: string | null,
): { ok: true; value: unknown } | { ok: false; invalidPath: string; error: string } {
  if (raw === null) {
    return { ok: true, value: {} };
  }
  const parsed = parseJsonStrict(raw);
  if (!parsed.ok) {
    return { ok: false, invalidPath: filePath, error: parsed.error };
  }
  return parsed;
}

/** Pure planner for FTC project setup writes (preview + write targets). */
export function buildFtcProjectSetupPlans(
  input: BuildFtcProjectSetupPlansInput,
): BuildFtcProjectSetupPlansResult {
  const extensionsPath = path.join(input.projectRoot, ".vscode", "extensions.json");
  const settingsPath = path.join(input.projectRoot, ".vscode", "settings.json");
  const configPath = path.join(input.projectRoot, ".ftc-dev.json");
  const tasksPath = path.join(input.projectRoot, ".vscode", "tasks.json");

  for (const check of [
    { path: extensionsPath, raw: input.extensionsJson },
    { path: settingsPath, raw: input.settingsJson },
  ]) {
    if (check.raw === null) {
      continue;
    }
    const parsed = parseJsonStrict(check.raw);
    if (!parsed.ok) {
      return { ok: false, invalidPath: check.path, error: parsed.error };
    }
  }

  if (input.tasksJson !== null) {
    const parsed = parseJsonStrict(input.tasksJson);
    if (!parsed.ok) {
      return { ok: false, invalidPath: tasksPath, error: parsed.error };
    }
  }

  const plans: FtcProjectSetupPlan[] = [];

  if (input.ftcDevJson === null) {
    plans.push({
      path: configPath,
      description: "Create .ftc-dev.json (no device serials)",
      content: formatJsonFile(buildDefaultFtcDevJsonDocument()),
    });
  }

  const extParsed = parseExistingOrEmpty(extensionsPath, input.extensionsJson);
  if (!extParsed.ok) {
    return { ok: false, invalidPath: extParsed.invalidPath, error: extParsed.error };
  }
  plans.push({
    path: extensionsPath,
    description: "Add/merge .vscode/extensions.json recommendations",
    content: formatJsonFile(mergeExtensionsJson(extParsed.value)),
  });

  const settingsParsed = parseExistingOrEmpty(settingsPath, input.settingsJson);
  if (!settingsParsed.ok) {
    return { ok: false, invalidPath: settingsParsed.invalidPath, error: settingsParsed.error };
  }
  plans.push({
    path: settingsPath,
    description: "Add safe shared workspace settings (no device serials)",
    content: formatJsonFile(mergeFtcWorkspaceSettings(settingsParsed.value)),
  });

  if (input.tasksJson === null) {
    plans.push({
      path: tasksPath,
      description: input.cliOnPath
        ? "Create FTC build/deploy tasks (ftc CLI on PATH)"
        : "Create FTC build/deploy tasks (FTC Dev Tools extension commands)",
      content: formatJsonFile(buildFtcProjectTasksDocument(input.tasksMode)),
    });
  }

  return { ok: true, plans };
}

/** Re-merge JSON-backed setup files immediately before write (matches extension command). */
export function refreshSetupPlanJsonContent(
  absolutePath: string,
  existingJson: unknown,
): string | undefined {
  if (absolutePath.endsWith("extensions.json")) {
    return formatJsonFile(mergeExtensionsJson(existingJson));
  }
  if (absolutePath.endsWith("settings.json")) {
    return formatJsonFile(mergeFtcWorkspaceSettings(existingJson));
  }
  return undefined;
}
