import { interpretFromUnknown } from "../errors/interpret.js";
import { DEFAULT_ROBOT_CONSOLE_URL } from "./defaults.js";
import { redactSecrets } from "./credentials.js";
import type {
  FetchLike,
  HubWifiManageGetResult,
  HubWifiManageSetInput,
  HubWifiManageSetResult,
  HubWifiSettings,
} from "./types.js";

/** Candidate POST endpoints for Apply Wi-Fi Settings (probed in order). */
export const HUB_WIFI_MANAGE_POST_CANDIDATES = [
  "/network_settings",
  "/manage/network_settings",
  "/manage",
  "/changeNetworkSettings",
] as const;

export interface GetHubWifiSettingsOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}

export interface SetHubWifiSettingsOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  input: HubWifiManageSetInput;
  dryRun?: boolean;
  yes?: boolean;
}

export function parseHubWifiSettingsFromHtml(html: string, sourceUrl: string): HubWifiSettings {
  const settings: HubWifiSettings = {
    sourceUrl,
    rawHints: [],
  };

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");

  const ssid =
    matchLabel(
      text,
      /(?:Network\s*Name|Wi-?Fi\s*Network|SSID|Access\s*Point\s*Name)\s*[:：]\s*(\S+)/i,
    ) ??
    matchField(
      html,
      /name=["'](?:deviceName|wifiName|ssid|networkName)["'][^>]*value=["']([^"']+)["']/i,
    ) ??
    matchField(
      html,
      /value=["']([^"']+)["'][^>]*name=["'](?:deviceName|wifiName|ssid|networkName)["']/i,
    );

  const password =
    matchLabel(
      text,
      /(?:Password|Passphrase|RC\s*Password|Access\s*Point\s*Password)\s*[:：]\s*(\S+)/i,
    ) ??
    matchField(
      html,
      /name=["'](?:password|wifiPassword|passphrase)["'][^>]*value=["']([^"']+)["']/i,
    ) ??
    matchField(
      html,
      /value=["']([^"']+)["'][^>]*name=["'](?:password|wifiPassword|passphrase)["']/i,
    );

  const channel =
    matchLabel(text, /(?:Channel)\s*[:：]\s*([0-9A-Za-z._-]{1,16})/i) ??
    matchField(html, /name=["'](?:channel|apChannel)["'][^>]*value=["']([^"']+)["']/i);

  const band =
    matchLabel(text, /(?:Band)\s*[:：]\s*([0-9.]+\s*GHz)/i) ??
    matchField(html, /name=["'](?:band|wifiBand)["'][^>]*value=["']([^"']+)["']/i);

  if (ssid) {
    settings.ssid = cleanCaptured(ssid);
    settings.rawHints.push("ssid");
  }
  if (password) {
    settings.password = cleanCaptured(password);
    settings.rawHints.push("password");
  }
  if (channel) {
    settings.channel = cleanCaptured(channel);
    settings.rawHints.push("channel");
  }
  if (band) {
    settings.band = cleanCaptured(band);
    settings.rawHints.push("band");
  }

  return settings;
}

function matchLabel(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  return m?.[1]?.trim();
}

function matchField(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m?.[1]?.trim();
}

function cleanCaptured(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function toPublicHubSettings(
  settings: HubWifiSettings,
): HubWifiManageGetResult["publicSettings"] {
  return {
    ssid: settings.ssid,
    band: settings.band,
    channel: settings.channel,
    sourceUrl: settings.sourceUrl,
    rawHints: settings.rawHints.filter((h) => h !== "password"),
    passwordSet: Boolean(settings.password),
  };
}

export async function getHubWifiSettings(
  options: GetHubWifiSettingsOptions = {},
): Promise<HubWifiManageGetResult> {
  const baseUrl = (options.baseUrl ?? DEFAULT_ROBOT_CONSOLE_URL).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    return {
      success: false,
      message: "fetch is not available.",
      error: interpretFromUnknown(
        Object.assign(new Error("fetch unavailable"), { code: "WIFI_MANAGE_API_UNSUPPORTED" }),
      ),
    };
  }

  const pages = [`${baseUrl}/`, `${baseUrl}/manage`];
  const merged: HubWifiSettings = { sourceUrl: baseUrl, rawHints: [] };
  let anyOk = false;

  try {
    for (const url of pages) {
      const response = await fetchImpl(url, {
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal: options.signal,
      });
      if (!response.ok && response.status >= 500) {
        continue;
      }
      anyOk = true;
      const html = await response.text();
      const parsed = parseHubWifiSettingsFromHtml(html, url);
      if (parsed.ssid && !merged.ssid) {
        merged.ssid = parsed.ssid;
      }
      if (parsed.password && !merged.password) {
        merged.password = parsed.password;
      }
      if (parsed.channel && !merged.channel) {
        merged.channel = parsed.channel;
      }
      if (parsed.band && !merged.band) {
        merged.band = parsed.band;
      }
      merged.rawHints.push(...parsed.rawHints.map((h) => `${h}@${url}`));
      if (parsed.ssid || parsed.password) {
        merged.sourceUrl = url;
      }
    }

    if (!anyOk) {
      return {
        success: false,
        message: "Could not reach Robot Controller Console manage pages.",
        error: interpretFromUnknown(
          Object.assign(new Error("Robot Controller Console unreachable"), {
            code: "WIFI_CONSOLE_UNREACHABLE",
          }),
        ),
      };
    }

    if (!merged.ssid && !merged.password && !merged.channel) {
      return {
        success: false,
        message:
          "Console reachable, but Wi-Fi fields were not found. Open the Manage page in a browser or update FTC Dev Tools.",
        publicSettings: toPublicHubSettings(merged),
        error: interpretFromUnknown(
          Object.assign(new Error("Manage API fields not found"), {
            code: "WIFI_MANAGE_API_UNSUPPORTED",
          }),
        ),
      };
    }

    return {
      success: true,
      settings: merged,
      publicSettings: toPublicHubSettings(merged),
      message: merged.ssid
        ? `Hub Wi-Fi SSID: ${merged.ssid}${merged.channel ? ` (channel ${merged.channel})` : ""}.`
        : "Read hub Wi-Fi settings from Robot Controller Console.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to read hub Wi-Fi settings.",
      error: interpretFromUnknown(error),
    };
  }
}

export async function setHubWifiSettings(
  options: SetHubWifiSettingsOptions,
): Promise<HubWifiManageSetResult> {
  const baseUrl = (options.baseUrl ?? DEFAULT_ROBOT_CONSOLE_URL).replace(/\/$/, "");
  const attempted: string[] = [];
  const input = options.input;

  if (!input.ssid && !input.password && !input.band && !input.channel) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      attemptedEndpoints: attempted,
      message: "No Wi-Fi settings provided to change.",
      error: interpretFromUnknown(
        Object.assign(new Error("Empty manage set input"), { code: "WIFI_MANAGE_API_UNSUPPORTED" }),
      ),
    };
  }

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      attemptedEndpoints: HUB_WIFI_MANAGE_POST_CANDIDATES.map((p) => `${baseUrl}${p}`),
      message: `Dry run: would apply hub Wi-Fi changes (ssid=${input.ssid ?? "(unchanged)"}, password=${input.password ? "(set)" : "(unchanged)"}, band=${input.band ?? "(unchanged)"}, channel=${input.channel ?? "(unchanged)"}).`,
    };
  }

  if (!options.yes) {
    return {
      success: false,
      dryRun: false,
      attemptedEndpoints: attempted,
      message: "Refusing to apply hub Wi-Fi settings without --yes (this disconnects clients).",
      error: interpretFromUnknown(
        Object.assign(new Error("Manage set requires --yes"), {
          code: "WIFI_MANAGE_API_UNSUPPORTED",
        }),
      ),
    };
  }

  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    return {
      success: false,
      dryRun: false,
      attemptedEndpoints: attempted,
      message: "fetch is not available.",
      error: interpretFromUnknown(
        Object.assign(new Error("fetch unavailable"), { code: "WIFI_MANAGE_API_UNSUPPORTED" }),
      ),
    };
  }

  const bodyVariants = buildFormBodies(input);

  try {
    for (const path of HUB_WIFI_MANAGE_POST_CANDIDATES) {
      const url = `${baseUrl}${path}`;
      attempted.push(url);
      for (const body of bodyVariants) {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "text/html,application/json",
          },
          body,
          signal: options.signal,
        });
        if (response.ok || response.status === 302 || response.status === 303) {
          return {
            success: true,
            dryRun: false,
            attemptedEndpoints: attempted,
            message:
              "Applied hub Wi-Fi settings. Reconnect to the new SSID/password if they changed, then run `ftc wifi connect --yes`.",
          };
        }
      }
    }

    return {
      success: false,
      dryRun: false,
      attemptedEndpoints: attempted,
      message:
        "Could not apply Wi-Fi settings via known console endpoints. Use `ftc wifi open-console` and Apply Wi-Fi Settings manually.",
      error: interpretFromUnknown(
        Object.assign(new Error("Manage apply endpoints unsupported on this RC version"), {
          code: "WIFI_MANAGE_API_UNSUPPORTED",
          technicalDetails: redactSecrets(`Tried: ${attempted.join(", ")}`, [input.password ?? ""]),
        }),
      ),
    };
  } catch (error) {
    const friendly = interpretFromUnknown(error);
    return {
      success: false,
      dryRun: false,
      attemptedEndpoints: attempted,
      message: "Failed while applying hub Wi-Fi settings.",
      error: {
        ...friendly,
        technicalDetails: redactSecrets(friendly.technicalDetails ?? "", [input.password ?? ""]),
        code: friendly.code === "UNKNOWN_ERROR" ? "WIFI_MANAGE_API_UNSUPPORTED" : friendly.code,
      },
    };
  }
}

function buildFormBodies(input: HubWifiManageSetInput): string[] {
  const variants: Array<Record<string, string>> = [
    {
      ...(input.ssid ? { name: input.ssid, deviceName: input.ssid, wifiName: input.ssid } : {}),
      ...(input.password
        ? { password: input.password, wifiPassword: input.password, passphrase: input.password }
        : {}),
      ...(input.channel ? { channel: input.channel, apChannel: input.channel } : {}),
      ...(input.band ? { band: input.band, wifiBand: input.band } : {}),
    },
    {
      ...(input.ssid ? { deviceName: input.ssid } : {}),
      ...(input.password ? { password: input.password } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.band ? { band: input.band } : {}),
    },
  ];
  return variants.map((fields) =>
    Object.entries(fields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&"),
  );
}
