import type {
  ReadinessCategoryState,
  ReadinessLevel,
  ReadinessSnapshot,
} from "./readiness-model.js";

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  pass: "Ready",
  unknown: "Unknown",
  warn: "Needs attention",
  fail: "Not ready",
};

export function readinessLevelLabel(level: ReadinessLevel): string {
  return LEVEL_LABEL[level];
}

export function formatReadinessCategoryLine(category: ReadinessCategoryState): string {
  return `${category.title}: ${LEVEL_LABEL[category.level]} — ${category.summary}`;
}

export function listReadinessCategoriesNeedingAttention(
  snapshot: ReadinessSnapshot,
): ReadinessCategoryState[] {
  return snapshot.categories.filter((c) => c.level === "fail" || c.level === "warn");
}

export function formatReadinessOverviewLines(snapshot: ReadinessSnapshot): string[] {
  return snapshot.categories.map((c) => formatReadinessCategoryLine(c));
}
