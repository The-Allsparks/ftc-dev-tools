import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { DetectedOpMode, OpModeKind, OpModeListResult } from "./types.js";

export async function listOpModes(projectRoot: string): Promise<OpModeListResult> {
  const root = path.resolve(projectRoot);
  try {
    const adapter = new OfficialFtcProjectAdapter();
    const info = await adapter.inspect(root);
    if (!info.teamCodeSourcePath) {
      return {
        projectRoot: root,
        opmodes: [],
        message: "No TeamCode source path found.",
        error: interpretFromUnknown(
          Object.assign(new Error("TeamCode missing"), { code: "OPMODE_PROJECT_UNSUPPORTED" }),
        ),
      };
    }

    const opmodes: DetectedOpMode[] = [];
    await walkJavaFiles(info.teamCodeSourcePath, async (fullPath) => {
      const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
      const text = await fs.readFile(fullPath, "utf8");
      const detected = parseOpModeFromSource(text, relativePath);
      if (detected) {
        opmodes.push(detected);
      }
    });

    opmodes.sort((a, b) => a.className.localeCompare(b.className));
    return {
      projectRoot: root,
      teamCodeSourcePath: info.teamCodeSourcePath,
      opmodes,
      message:
        opmodes.length === 0
          ? "No @TeleOp / @Autonomous OpModes found under TeamCode."
          : `Found ${opmodes.length} OpMode(s) under TeamCode.`,
    };
  } catch (error) {
    return {
      projectRoot: root,
      opmodes: [],
      message: "Failed to list OpModes.",
      error: interpretFromUnknown(error),
    };
  }
}

export function parseOpModeFromSource(
  text: string,
  relativePath: string,
): DetectedOpMode | undefined {
  const tele = text.match(/@TeleOp\s*(?:\(([^)]*)\))?/);
  const auto = text.match(/@Autonomous\s*(?:\(([^)]*)\))?/);
  let kind: OpModeKind | undefined;
  let attrs = "";
  if (tele) {
    kind = "teleop";
    attrs = tele[1] ?? "";
  } else if (auto) {
    kind = "autonomous";
    attrs = auto[1] ?? "";
  } else {
    return undefined;
  }

  const classMatch = text.match(/\b(?:public\s+)?(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (!classMatch?.[1]) {
    return undefined;
  }

  const packageMatch = text.match(/^\s*package\s+([A-Za-z0-9_.]+)\s*;/m);
  const groupMatch = attrs.match(/group\s*=\s*"([^"]*)"/);

  return {
    className: classMatch[1],
    kind,
    group: groupMatch?.[1],
    relativePath,
    packageName: packageMatch?.[1],
  };
}

async function walkJavaFiles(dir: string, visit: (full: string) => Promise<void>): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkJavaFiles(full, visit);
    } else if (entry.isFile() && entry.name.endsWith(".java")) {
      await visit(full);
    }
  }
}
