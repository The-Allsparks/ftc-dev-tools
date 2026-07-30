import type { ReplayStatusReport } from "@ftc-dev-tools/shared";
import { escapeHtml } from "./vision-lab-text.js";

export function renderReplaySection(report: ReplayStatusReport | undefined): string {
  if (!report) {
    return `<section id="replay" aria-labelledby="replay-title" class="section">
      <h2 id="replay-title">Live camera &amp; replay</h2>
      <p class="placeholder" role="note">Replay status unavailable.</p>
    </section>`;
  }

  const capabilityRows = Object.entries(report.capabilities)
    .map(
      ([key, enabled]) =>
        `<tr><th scope="row">${escapeHtml(key)}</th><td>${enabled ? "yes" : "deferred"}</td></tr>`,
    )
    .join("");

  const backendList =
    report.replayBackends.length === 0
      ? `<p>No replay backends registered.</p>`
      : `<ul class="list" aria-label="Replay backends">${report.replayBackends
          .map(
            (backend) =>
              `<li><span class="mono">${escapeHtml(backend.id)}</span> — ${escapeHtml(backend.summary)}</li>`,
          )
          .join("")}</ul>`;

  const gitignore = report.gitignoreRecommendations
    .map((entry) => `<li class="mono">${escapeHtml(entry)}</li>`)
    .join("");

  return `<section id="replay" aria-labelledby="replay-title" class="section">
    <h2 id="replay-title">Live camera &amp; replay</h2>
    <p>${escapeHtml(report.message)}</p>
    <p class="hint">Header schema v${escapeHtml(report.headerSchemaVersion)} · Event schema v${escapeHtml(report.eventSchemaVersion)}</p>
    <h3>Capabilities</h3>
    <table class="inspector-table metrics" aria-label="Replay capabilities">
      <tbody>${capabilityRows}</tbody>
    </table>
    <h3>Session limits (future capture)</h3>
    <ul class="sublist">
      <li>Max duration: ${report.limits.maxDurationMs} ms</li>
      <li>Max total size: ${report.limits.maxTotalBytes} bytes</li>
      <li>Max event payload: ${report.limits.maxEventPayloadBytes} bytes</li>
    </ul>
    ${backendList}
    <h3>Recommended .gitignore</h3>
    <ul class="sublist">${gitignore}</ul>
    <p class="hint">Live capture, offline playback, and Vision Lab record controls are deferred (liveCapture=${report.capabilities.liveCapture ? "yes" : "no"}, offlineReplay=${report.capabilities.offlineReplay ? "yes" : "no"}).</p>
  </section>`;
}
