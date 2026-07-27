import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snippetPath = path.join(root, "snippets", "ftc-java.code-snippets");

const REQUIRED_PREFIXES = [
  "ftc-teleop",
  "ftc-teleop-linear",
  "ftc-auto",
  "ftc-motor",
  "ftc-servo",
  "ftc-gamepad-edge",
  "ftc-imu",
  "ftc-telemetry",
  "ftc-elapsed",
  "ftc-vision",
  "ftc-apriltag",
  "ftc-safe-stop",
];

describe("FTC Java snippets", () => {
  it("parses as JSON and includes required prefixes", () => {
    const raw = fs.readFileSync(snippetPath, "utf8");
    const data = JSON.parse(raw) as Record<
      string,
      { prefix: string; body: string | string[]; description?: string }
    >;
    const prefixes = Object.values(data).map((entry) => entry.prefix);
    for (const required of REQUIRED_PREFIXES) {
      expect(prefixes).toContain(required);
    }
    for (const [name, entry] of Object.entries(data)) {
      expect(entry.prefix, name).toMatch(/^ftc-/);
      expect(entry.body, name).toBeTruthy();
      const body = Array.isArray(entry.body) ? entry.body.join("\n") : entry.body;
      expect(body.includes("com.example.team"), name).toBe(false);
      expect(body.toLowerCase().includes("decode"), `${name} season-specific`).toBe(false);
    }
  });

  it("is contributed from the extension package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      contributes?: { snippets?: Array<{ language: string; path: string }> };
    };
    const snippets = pkg.contributes?.snippets ?? [];
    expect(snippets.some((s) => s.path.includes("ftc-java.code-snippets"))).toBe(true);
  });
});
