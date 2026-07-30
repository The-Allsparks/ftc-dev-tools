import type { VisionInspectorSnapshot } from "@ftc-dev-tools/shared";
import { escapeHtml } from "./vision-lab-text.js";

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return String(Math.round(value * 100) / 100);
}

function renderOverlaySvg(snapshot: VisionInspectorSnapshot): string {
  const shapes: string[] = [
    `<line x1="0.5" y1="0" x2="0.5" y2="1" stroke="var(--vscode-editorWarning-foreground)" stroke-width="0.002" vector-effect="non-scaling-stroke" opacity="0.5" />`,
    `<line x1="0" y1="0.5" x2="1" y2="0.5" stroke="var(--vscode-editorWarning-foreground)" stroke-width="0.002" vector-effect="non-scaling-stroke" opacity="0.5" />`,
  ];

  for (const detection of snapshot.detections) {
    for (const element of detection.overlay) {
      if (element.kind === "target-point" && element.point) {
        shapes.push(
          `<circle cx="${element.point.x}" cy="${element.point.y}" r="0.018" fill="var(--vscode-charts-green)" stroke="var(--vscode-foreground)" stroke-width="0.0015" vector-effect="non-scaling-stroke" />`,
        );
      }
      if (element.kind === "box" && element.box) {
        const { x, y, width, height } = element.box;
        shapes.push(
          `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="var(--vscode-charts-blue)" stroke-width="0.002" vector-effect="non-scaling-stroke" />`,
        );
      }
    }
  }

  return `<div class="overlay-frame" role="img" aria-label="Normalized overlay preview without live video">
    <svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet" class="overlay-svg">${shapes.join("")}</svg>
    <p class="hint">Overlay preview uses normalized coordinates. Live video alignment is deferred.</p>
  </div>`;
}

function renderDetectionsTable(snapshot: VisionInspectorSnapshot): string {
  if (snapshot.detections.length === 0) {
    return `<p>No detections available.</p>`;
  }

  const header = `<tr><th scope="col">Label</th><th scope="col">Valid</th><th scope="col">tx°</th><th scope="col">ty°</th><th scope="col">Area %</th></tr>`;
  const rows = snapshot.detections
    .map((detection) => {
      return `<tr>
        <td>${escapeHtml(detection.label)}</td>
        <td>${detection.valid ? "yes" : "no"}</td>
        <td>${formatMetric(detection.txDegrees ?? null)}</td>
        <td>${formatMetric(detection.tyDegrees ?? null)}</td>
        <td>${formatMetric(detection.areaPercent ?? null)}</td>
      </tr>`;
    })
    .join("");

  return `<table class="inspector-table" aria-label="Vision detections">
    <thead>${header}</thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderMetrics(snapshot: VisionInspectorSnapshot): string {
  const m = snapshot.metrics;
  const rows = [
    ["FPS", formatMetric(m.fps)],
    ["Capture latency (ms)", formatMetric(m.captureLatencyMs)],
    ["Pipeline latency (ms)", formatMetric(m.pipelineLatencyMs)],
    ["Total latency (ms)", formatMetric(m.totalLatencyMs)],
    ["Frame age (ms)", formatMetric(m.frameAgeMs)],
    ["CPU %", formatMetric(m.cpuPercent)],
    ["Temperature °C", formatMetric(m.temperatureCelsius)],
  ];

  return `<table class="inspector-table metrics" aria-label="Performance metrics">
    <tbody>${rows
      .map(
        ([label, value]) =>
          `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

export function renderVisionInspectorSection(
  snapshot: VisionInspectorSnapshot | undefined,
  copyCommand?: string,
): string {
  if (!snapshot) {
    return `<section id="inspector" aria-labelledby="inspector-title" class="section">
      <h2 id="inspector-title">Result inspector</h2>
      <p class="placeholder" role="note">Refresh the full Vision Lab panel with network probing enabled to load structured provider results. Sidebar view stays offline-only.</p>
    </section>`;
  }

  const selected = snapshot.selectedTarget;
  const selectedBlock = selected
    ? `<article aria-label="Selected target details">
        <h3>Selected target</h3>
        <p>${escapeHtml(selected.label)} ${selected.valid ? "(valid)" : "(invalid)"}</p>
        ${
          selected.classifierClass
            ? `<p class="mono">Classifier: ${escapeHtml(selected.classifierClass)}</p>`
            : ""
        }
        ${
          selected.detectorClass
            ? `<p class="mono">Detector: ${escapeHtml(selected.detectorClass)}</p>`
            : ""
        }
      </article>`
    : "";

  const timestamps = [
    snapshot.resultTimestamp ? `Result: ${snapshot.resultTimestamp}` : undefined,
    snapshot.frameTimestamp ? `Frame: ${snapshot.frameTimestamp}` : undefined,
    snapshot.stale ? "Status: stale" : "Status: fresh",
  ]
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line!)}</li>`)
    .join("");

  const rawJson = snapshot.rawPayload
    ? `<details><summary>Raw provider payload</summary><pre class="raw-json">${escapeHtml(JSON.stringify(snapshot.rawPayload, null, 2))}</pre></details>`
    : `<p class="hint">Raw payload unavailable.</p>`;

  const copyLink = copyCommand
    ? `<p><a class="action" href="command:${escapeHtml(copyCommand)}" aria-label="Copy inspector JSON to clipboard">Copy as JSON</a></p>`
    : "";

  return `<section id="inspector" aria-labelledby="inspector-title" class="section">
    <h2 id="inspector-title">Result inspector — ${escapeHtml(snapshot.providerLabel)}</h2>
    <p>${escapeHtml(snapshot.message)}</p>
    ${snapshot.requiresSelection ? `<p class="warn" role="status">Explicit host selection required before live results.</p>` : ""}
    <p class="hint mono">${escapeHtml(snapshot.overlayConvention)}</p>
    ${renderOverlaySvg(snapshot)}
    ${selectedBlock}
    <h3>Detections</h3>
    ${renderDetectionsTable(snapshot)}
    <h3>Performance metrics</h3>
    ${renderMetrics(snapshot)}
    <ul class="sublist" aria-label="Timestamps">${timestamps}</ul>
    ${rawJson}
    ${copyLink}
    <p class="hint">Live video overlay, graphs, and export are deferred (capabilities: liveVideoOverlay=${snapshot.capabilities.liveVideoOverlay ? "yes" : "no"}, metricsGraphs=${snapshot.capabilities.metricsGraphs ? "yes" : "no"}).</p>
  </section>`;
}
