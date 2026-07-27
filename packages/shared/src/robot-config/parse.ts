import type { RobotConfigDevice } from "./types.js";

/**
 * Lightweight XML scrape for FTC robot config files.
 * Does not fully implement XML; sufficient for device inventory + validation.
 */
export function parseRobotConfigXml(xml: string): {
  rootType?: string;
  devices: RobotConfigDevice[];
} {
  const rootMatch = xml.match(/<Robot\b([^>]*)>/i);
  const rootType = rootMatch?.[1]?.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];

  const devices: RobotConfigDevice[] = [];
  const stack: string[] = [];
  const anyTag = /<\/?([A-Za-z][\w.]*)\b([^>]*)>/g;

  for (const match of xml.matchAll(anyTag)) {
    const full = match[0] ?? "";
    const name = match[1] ?? "";
    const attrs = match[2] ?? "";

    if (full.startsWith("</")) {
      const idx = stack.lastIndexOf(name);
      if (idx >= 0) {
        stack.splice(idx);
      }
      continue;
    }

    const selfClosing = full.endsWith("/>") || /\/\s*>$/.test(full);
    const nameAttr = attrs.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
    const portAttr = attrs.match(/\bport\s*=\s*["']([^"']+)["']/i)?.[1];

    if (nameAttr && name.toLowerCase() !== "robot") {
      devices.push({
        type: name,
        name: nameAttr,
        port: portAttr,
        parentPath: [...stack],
      });
    }

    if (!selfClosing) {
      stack.push(name);
    }
  }

  return { rootType, devices };
}
