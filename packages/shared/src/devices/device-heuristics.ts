import type { ConnectionType, ControlHubLikelihood } from "../types/device.js";

export function inferConnectionType(serial: string): ConnectionType {
  // Wi-Fi ADB serials commonly look like host:port
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(serial) || serial.includes(":")) {
    return "wifi";
  }
  return "usb";
}

export function inferControlHubLikelihood(input: {
  model?: string;
  manufacturer?: string;
  product?: string;
  props: Record<string, string>;
}): ControlHubLikelihood {
  const haystack = [input.model, input.manufacturer, input.product, ...Object.values(input.props)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    return "unknown";
  }

  if (
    haystack.includes("control hub") ||
    haystack.includes("controlhub") ||
    haystack.includes("rev robotics") ||
    /\brev\b/.test(haystack)
  ) {
    return "probable";
  }

  return "unlikely";
}
