import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { CONFIG_FILE_NAME, FTC_DEV_SCHEMA_URL } from "../constants.js";
import type { ConfigLoadResult, FtcDevConfig } from "../types/config.js";
import { ftcDevSchema } from "./schema.js";

type AjvConstructor = new (options?: object) => {
  compile: (schema: object) => ((data: unknown) => boolean) & {
    errors?: Array<{ instancePath?: string; message?: string }> | null;
  };
};
type AddFormatsFn = (ajv: object) => unknown;

const Ajv2020 =
  (Ajv2020Import as unknown as { default?: AjvConstructor }).default ??
  (Ajv2020Import as unknown as AjvConstructor);
const addFormats = ((addFormatsImport as unknown as { default?: AddFormatsFn }).default ??
  addFormatsImport) as AddFormatsFn;

const SECRET_KEYS = new Set([
  "password",
  "wifipassword",
  "wifi_password",
  "apikey",
  "api_key",
  "secret",
  "token",
  "credential",
  "credentials",
]);

const KNOWN_TOP_LEVEL = new Set([
  "$schema",
  "teamNumber",
  "module",
  "deployment",
  "logs",
  "vision",
]);
const KNOWN_DEPLOYMENT = new Set(["preferredConnection", "preferredDeviceSerial"]);
const KNOWN_LOGS = new Set(["defaultFilter"]);
const KNOWN_VISION = new Set([
  "defaultProviderId",
  "enabledProviderIds",
  "pipelineDirectory",
  "limelight",
]);
const KNOWN_LIMELIGHT = new Set(["host", "pipelineDirectory"]);

export function defaultConfig(): FtcDevConfig {
  return {
    $schema: FTC_DEV_SCHEMA_URL,
    module: "TeamCode",
    deployment: {
      preferredConnection: "any",
      preferredDeviceSerial: "",
    },
    logs: {
      defaultFilter: "teamcode",
    },
  };
}

export async function loadProjectConfig(projectRoot: string): Promise<ConfigLoadResult> {
  const configPath = path.join(projectRoot, CONFIG_FILE_NAME);
  const warnings: string[] = [];
  const errors: string[] = [];

  let rawText: string;
  try {
    rawText = await fs.readFile(configPath, "utf8");
  } catch {
    return {
      config: defaultConfig(),
      warnings: [],
      errors: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch (error) {
    errors.push(
      `Invalid JSON in ${CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { config: defaultConfig(), path: configPath, warnings, errors };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    errors.push(`${CONFIG_FILE_NAME} must contain a JSON object.`);
    return { config: defaultConfig(), path: configPath, warnings, errors };
  }

  const objectValue = parsed as Record<string, unknown>;
  collectUnknownPropertyWarnings(objectValue, warnings);
  collectSecretWarnings(objectValue, warnings);

  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(ftcDevSchema as unknown as object);
  const valid = validate(objectValue);
  if (!valid && validate.errors) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath || "/"} ${err.message ?? "invalid"}`.trim());
    }
  }

  const config = mergeWithDefaults(objectValue as FtcDevConfig);
  if (config.deployment?.preferredDeviceSerial) {
    warnings.push(
      "deployment.preferredDeviceSerial is machine-local. Prefer not committing real serials to shared repositories.",
    );
  }

  return {
    config,
    path: configPath,
    warnings,
    errors,
  };
}

function mergeWithDefaults(partial: FtcDevConfig): FtcDevConfig {
  const defaults = defaultConfig();
  return {
    ...defaults,
    ...partial,
    deployment: {
      ...defaults.deployment,
      ...partial.deployment,
    },
    logs: {
      ...defaults.logs,
      ...partial.logs,
    },
    vision: partial.vision
      ? {
          ...partial.vision,
          enabledProviderIds: partial.vision.enabledProviderIds
            ? [...partial.vision.enabledProviderIds]
            : undefined,
          limelight: partial.vision.limelight ? { ...partial.vision.limelight } : undefined,
        }
      : undefined,
  };
}

function collectUnknownPropertyWarnings(value: Record<string, unknown>, warnings: string[]): void {
  for (const key of Object.keys(value)) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      warnings.push(`Unknown property "${key}" in ${CONFIG_FILE_NAME} will be ignored.`);
    }
  }
  if (
    value.deployment &&
    typeof value.deployment === "object" &&
    !Array.isArray(value.deployment)
  ) {
    for (const key of Object.keys(value.deployment as Record<string, unknown>)) {
      if (!KNOWN_DEPLOYMENT.has(key)) {
        warnings.push(`Unknown property "deployment.${key}" will be ignored.`);
      }
    }
  }
  if (value.logs && typeof value.logs === "object" && !Array.isArray(value.logs)) {
    for (const key of Object.keys(value.logs as Record<string, unknown>)) {
      if (!KNOWN_LOGS.has(key)) {
        warnings.push(`Unknown property "logs.${key}" will be ignored.`);
      }
    }
  }
  if (value.vision && typeof value.vision === "object" && !Array.isArray(value.vision)) {
    for (const key of Object.keys(value.vision as Record<string, unknown>)) {
      if (!KNOWN_VISION.has(key)) {
        warnings.push(`Unknown property "vision.${key}" will be ignored.`);
      }
    }
    const limelight = (value.vision as Record<string, unknown>).limelight;
    if (limelight && typeof limelight === "object" && !Array.isArray(limelight)) {
      for (const key of Object.keys(limelight as Record<string, unknown>)) {
        if (!KNOWN_LIMELIGHT.has(key)) {
          warnings.push(`Unknown property "vision.limelight.${key}" will be ignored.`);
        }
      }
    }
  }
}

function collectSecretWarnings(value: Record<string, unknown>, warnings: string[]): void {
  const stack: Array<{ path: string; node: unknown }> = [{ path: "", node: value }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (!current.node || typeof current.node !== "object" || Array.isArray(current.node)) {
      continue;
    }
    for (const [key, child] of Object.entries(current.node as Record<string, unknown>)) {
      const nextPath = current.path ? `${current.path}.${key}` : key;
      if (SECRET_KEYS.has(key.toLowerCase())) {
        warnings.push(
          `Possible secret field "${nextPath}" detected. Passwords, Wi-Fi credentials, and API keys must not be stored in ${CONFIG_FILE_NAME}.`,
        );
      }
      if (child && typeof child === "object") {
        stack.push({ path: nextPath, node: child });
      }
    }
  }
}
