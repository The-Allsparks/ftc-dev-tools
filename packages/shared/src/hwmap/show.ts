import { interpretFromUnknown } from "../errors/interpret.js";
import { buildHardwareMapEntries, resolveConfigForHwMap } from "./resolve.js";
import type { HardwareMapShowResult } from "./types.js";

export async function showHardwareMap(
  projectRoot: string,
  configName?: string,
): Promise<HardwareMapShowResult> {
  try {
    const resolved = await resolveConfigForHwMap(projectRoot, configName);
    if (!resolved.config) {
      return {
        success: false,
        entries: [],
        message: resolved.errorMessage ?? "Failed to resolve robot config.",
        error: interpretFromUnknown(
          Object.assign(new Error(resolved.errorMessage ?? "hwmap config"), {
            code: resolved.code ?? "HWMAP_NO_CONFIG",
          }),
        ),
      };
    }

    const entries = await buildHardwareMapEntries(resolved.config.absolutePath);
    const codegenCount = entries.filter((e) => e.includedInCodegen).length;
    return {
      success: true,
      configName: resolved.config.name,
      configPath: resolved.config.relativePath,
      entries,
      message: `Hardware map for "${resolved.config.name}": ${entries.length} entr(y/ies), ${codegenCount} codegen-ready.`,
    };
  } catch (error) {
    return {
      success: false,
      entries: [],
      message: "Failed to show hardware map.",
      error: interpretFromUnknown(error),
    };
  }
}
