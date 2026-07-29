/** Workspace / project-local record of the last successful Gradle build (#82). */
export const LAST_SUCCESSFUL_BUILD_KEY = "ftc.lastSuccessfulBuild";

export interface LastSuccessfulBuildSnapshot {
  completedAt: string;
  apkPath?: string;
}

export function isLastSuccessfulBuildSnapshot(
  value: unknown,
): value is LastSuccessfulBuildSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.completedAt === "string";
}
