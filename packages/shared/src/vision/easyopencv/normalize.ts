import type { EasyOpenCvCustomDiagnosticAdapter, EasyOpenCvDiagnosticResult } from "./types.js";

const customAdapters: EasyOpenCvCustomDiagnosticAdapter[] = [];

export function registerEasyOpenCvDiagnosticAdapter(
  adapter: EasyOpenCvCustomDiagnosticAdapter,
): void {
  customAdapters.push(adapter);
}

export function normalizeEasyOpenCvDiagnosticResult(input: {
  pipelineClassName?: string;
  summary?: string;
}): EasyOpenCvDiagnosticResult {
  const summary = input.summary?.trim() ?? "";
  const result: EasyOpenCvDiagnosticResult = {
    pipelineClassName: input.pipelineClassName,
    summary: summary || undefined,
    raw: summary,
  };

  const fpsMatch = summary.match(/(?:fps|frames?\s*\/\s*s)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (fpsMatch?.[1]) {
    result.fps = Number.parseFloat(fpsMatch[1]);
  }

  const latencyMatch = summary.match(/latency\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*ms/i);
  if (latencyMatch?.[1]) {
    result.latencyMs = Number.parseFloat(latencyMatch[1]);
  }

  for (const adapter of customAdapters) {
    if (adapter.matches(input.pipelineClassName, summary)) {
      return { ...result, ...adapter.normalize(summary) };
    }
  }

  return result;
}
