import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type PackageJson = {
  contributes?: {
    commands?: Array<{ command: string }>;
    walkthroughs?: Array<{
      id: string;
      steps: Array<{
        id: string;
        completionEvents?: string[];
        media?: { markdown?: string; image?: string };
      }>;
    }>;
  };
};

function loadPackage(): PackageJson {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as PackageJson;
}

function commandIdsFromWalkthrough(pkg: PackageJson): string[] {
  const ids = new Set<string>();
  for (const walkthrough of pkg.contributes?.walkthroughs ?? []) {
    for (const step of walkthrough.steps) {
      for (const event of step.completionEvents ?? []) {
        const match = /^onCommand:(.+)$/.exec(event);
        if (match) {
          ids.add(match[1]!);
        }
      }
      const markdown = step.media?.markdown;
      if (markdown) {
        for (const m of markdown.matchAll(/\]\(command:([^?)]+)/g)) {
          ids.add(m[1]!);
        }
      }
    }
  }
  return [...ids];
}

describe("extension walkthrough (#37)", () => {
  it("contributes a rookie onboarding walkthrough with 5–8 steps", () => {
    const pkg = loadPackage();
    const walkthroughs = pkg.contributes?.walkthroughs ?? [];
    expect(walkthroughs.some((w) => w.id === "ftc.rookieOnboarding")).toBe(true);
    const rookie = walkthroughs.find((w) => w.id === "ftc.rookieOnboarding");
    expect(rookie?.steps.length).toBeGreaterThanOrEqual(5);
    expect(rookie?.steps.length).toBeLessThanOrEqual(8);
  });

  it("references only registered ftc commands", () => {
    const pkg = loadPackage();
    const registered = new Set((pkg.contributes?.commands ?? []).map((c) => c.command));
    const referenced = commandIdsFromWalkthrough(pkg);
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) {
      expect(registered.has(id), `missing command registration for ${id}`).toBe(true);
      expect(id.startsWith("ftc.")).toBe(true);
    }
  });

  it("uses extension media paths for walkthrough images", () => {
    const pkg = loadPackage();
    for (const walkthrough of pkg.contributes?.walkthroughs ?? []) {
      for (const step of walkthrough.steps) {
        const image = step.media?.image;
        if (image) {
          expect(fs.existsSync(path.join(root, image)), image).toBe(true);
        }
      }
    }
  });
});
