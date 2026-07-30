import type { VisionLabSnapshot } from "./vision-lab-data.js";
import { escapeAttribute, escapeHtml } from "./vision-lab-text.js";
import { renderVisionInspectorSection } from "./vision-lab-inspector-html.js";
import { renderReplaySection } from "./vision-lab-replay-html.js";

const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:;";

export interface RenderVisionLabHtmlOptions {
  compact?: boolean;
  openPanelCommand?: string;
  refreshCommand?: string;
  copyInspectorCommand?: string;
}

export function renderVisionLabHtml(
  snapshot: VisionLabSnapshot,
  options: RenderVisionLabHtmlOptions = {},
): string {
  const compact = options.compact === true;
  const title = compact ? "Vision Lab" : "FTC Vision Lab";
  const openPanel = options.openPanelCommand
    ? `<p><a class="action" href="command:${escapeAttribute(options.openPanelCommand)}" aria-label="Open full Vision Lab panel">Open full Vision Lab panel</a></p>`
    : "";

  const sections = [
    renderConnectionSection(snapshot),
    renderProvidersSection(snapshot),
    renderEndpointsSection(snapshot),
    renderWorkspaceSection(snapshot),
    renderProviderStatusSection(snapshot),
    renderPipelineSection(snapshot),
    renderDiagnosticsSection(snapshot),
    renderSourceSection(snapshot, options.refreshCommand),
    renderVisionInspectorSection(snapshot.resultInspector, options.copyInspectorCommand),
    renderReplaySection(snapshot.replayStatus),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${CSP}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${styles(compact)}</style>
</head>
<body>
  <main role="main" aria-label="Vision Lab">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Updated ${escapeHtml(formatTime(snapshot.generatedAt))}</p>
      ${openPanel}
    </header>
    ${sections}
  </main>
</body>
</html>`;
}

function renderConnectionSection(snapshot: VisionLabSnapshot): string {
  const stateText = connectionStateText(snapshot.connectionState);
  return section(
    "connection",
    "Connection",
    `<p class="status" aria-label="Connection state: ${escapeAttribute(stateText)}">
      <span class="status-icon" aria-hidden="true">${connectionStateIcon(snapshot.connectionState)}</span>
      <span><strong>${escapeHtml(stateText)}</strong> — ${escapeHtml(snapshot.connectionLabel)}</span>
    </p>
    ${snapshot.errors.length > 0 ? list("Errors", snapshot.errors, "errors") : ""}`,
  );
}

function renderProvidersSection(snapshot: VisionLabSnapshot): string {
  if (snapshot.providers.length === 0) {
    return section("providers", "Providers", `<p>No vision providers registered.</p>`);
  }

  const configured = snapshot.visionStatus?.config.defaultProviderId;
  const rows = snapshot.providers
    .map((provider) => {
      const selected = configured === provider.id ? `<span class="badge">default</span>` : "";
      const enabled = snapshot.visionStatus?.config.enabledProviderIds?.includes(provider.id)
        ? `<span class="badge">enabled</span>`
        : "";
      return `<li>
        <span class="mono">${escapeHtml(provider.id)}</span>
        ${selected}${enabled}
        <div>${escapeHtml(provider.displayName)} — ${escapeHtml(provider.summary)}</div>
      </li>`;
    })
    .join("");

  return section(
    "providers",
    "Provider catalog",
    `<ul class="list" aria-label="Registered vision providers">${rows}</ul>
     <p class="hint">Provider and endpoint pickers require explicit configuration when multiple targets exist.</p>`,
  );
}

function renderEndpointsSection(snapshot: VisionLabSnapshot): string {
  const devices = snapshot.devices;
  if (!devices) {
    return section(
      "endpoints",
      "Endpoints",
      `<p>Open an FTC project to discover vision endpoints.</p>`,
    );
  }

  if (devices.requiresSelection) {
    return section(
      "endpoints",
      "Endpoints",
      `<p class="warn" role="status">${escapeHtml(devices.selectionReasons.join(" "))}</p>
       ${endpointList(devices)}`,
    );
  }

  return section("endpoints", "Endpoints", endpointList(devices));
}

function endpointList(devices: NonNullable<VisionLabSnapshot["devices"]>): string {
  if (devices.endpoints.length === 0) {
    return `<p>No vision endpoints discovered.</p>`;
  }

  const rows = devices.endpoints
    .map((endpoint) => {
      const target = endpoint.url ?? endpoint.host ?? endpoint.id;
      const reach = endpoint.probe.reachable;
      return `<li>
        <span class="mono">${escapeHtml(endpoint.kind)}</span>
        <span class="reach reach-${escapeHtml(reach)}">${escapeHtml(reach)}</span>
        <div>${escapeHtml(target)}</div>
      </li>`;
    })
    .join("");

  return `<ul class="list" aria-label="Discovered vision endpoints">${rows}</ul>`;
}

function renderWorkspaceSection(snapshot: VisionLabSnapshot): string {
  const vision = snapshot.visionStatus;
  if (!vision) {
    return section("workspace", "Workspace", `<p>No FTC project open.</p>`);
  }

  const signals =
    vision.discovery.signals.length === 0
      ? `<p>No vision library signals detected.</p>`
      : `<ul class="list">${vision.discovery.signals
          .map(
            (signal) =>
              `<li><span class="mono">${escapeHtml(signal.kind)}</span> ${escapeHtml(signal.evidence)}</li>`,
          )
          .join("")}</ul>`;

  const configLines = [
    vision.config.defaultProviderId
      ? `Default provider: ${vision.config.defaultProviderId}`
      : undefined,
    vision.config.enabledProviderIds?.length
      ? `Enabled: ${vision.config.enabledProviderIds.join(", ")}`
      : undefined,
  ].filter(Boolean);

  const warnings = [...vision.configWarnings, ...vision.discovery.warnings, ...vision.configErrors];

  return section(
    "workspace",
    "Workspace discovery",
    `<p>${escapeHtml(vision.message)}</p>
     ${configLines.length > 0 ? `<ul class="list">${configLines.map((line) => `<li>${escapeHtml(line!)}</li>`).join("")}</ul>` : ""}
     ${signals}
     ${warnings.length > 0 ? list("Warnings", warnings, "warnings") : ""}`,
  );
}

function renderProviderStatusSection(snapshot: VisionLabSnapshot): string {
  if (snapshot.providerSections.length === 0) {
    return section(
      "provider-status",
      "Provider status",
      `<p>Enable a provider in <span class="mono">.ftc-dev.json</span> or add vision libraries to TeamCode.</p>`,
    );
  }

  const blocks = snapshot.providerSections
    .map((section) => {
      const error = section.error
        ? `<p class="warn" role="alert">${escapeHtml(section.error)}</p>`
        : "";
      const details =
        section.details.length > 0
          ? `<ul class="sublist">${section.details.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
          : "";
      return `<article class="provider-card" aria-label="${escapeAttribute(section.label)} status">
        <h3>${escapeHtml(section.label)}</h3>
        <p>${escapeHtml(section.message)}</p>
        ${error}
        ${details}
      </article>`;
    })
    .join("");

  return section("provider-status", "Provider status", blocks);
}

function renderPipelineSection(snapshot: VisionLabSnapshot): string {
  const dirs = snapshot.visionStatus?.discovery.pipelineDirectories ?? [];
  if (dirs.length === 0) {
    return section(
      "pipelines",
      "Pipeline artifacts",
      `<p>No pipeline directories detected in the workspace.</p>`,
    );
  }

  const rows = dirs
    .map(
      (dir) =>
        `<li><span class="mono">${escapeHtml(dir.relativePath)}</span> (${dir.fileCount} files)</li>`,
    )
    .join("");

  return section(
    "pipelines",
    "Pipeline artifacts",
    `<ul class="list" aria-label="Pipeline directories">${rows}</ul>`,
  );
}

function renderDiagnosticsSection(snapshot: VisionLabSnapshot): string {
  const warnings = snapshot.devices?.warnings ?? [];
  const bridge = snapshot.providerSections.find(
    (section) => section.providerId === "vision:bridge",
  );
  const lines = [...(bridge?.details ?? []), ...warnings].filter(Boolean);

  if (lines.length === 0) {
    return section("diagnostics", "Diagnostics", `<p>No additional diagnostics.</p>`);
  }

  return section("diagnostics", "Diagnostics", list("Diagnostics", lines, "diagnostics"));
}

function renderSourceSection(snapshot: VisionLabSnapshot, refreshCommand?: string): string {
  if (snapshot.sourceLinks.length === 0) {
    return section(
      "sources",
      "Source navigation",
      `<p>No pipeline or webcam source files detected yet.</p>`,
    );
  }

  const rows = snapshot.sourceLinks
    .map((link) => {
      const command = `command:ftc.visionOpenSource?${encodeURIComponent(JSON.stringify([link.relativePath]))}`;
      return `<li><a href="${escapeAttribute(command)}" aria-label="Open ${escapeAttribute(link.label)}">${escapeHtml(link.label)}</a> <span class="mono">${escapeHtml(link.relativePath)}</span></li>`;
    })
    .join("");

  const refresh = refreshCommand
    ? `<p><a class="action" href="command:${escapeAttribute(refreshCommand)}" aria-label="Refresh Vision Lab">Refresh</a></p>`
    : "";

  return section(
    "sources",
    "Source navigation",
    `<ul class="list" aria-label="Vision source files">${rows}</ul>${refresh}`,
  );
}

function section(id: string, title: string, body: string): string {
  return `<section id="${id}" aria-labelledby="${id}-title" class="section">
    <h2 id="${id}-title">${title}</h2>
    ${body}
  </section>`;
}

function list(title: string, items: string[], className: string): string {
  return `<div class="${className}"><strong>${escapeHtml(title)}</strong><ul class="sublist">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul></div>`;
}

function connectionStateText(state: VisionLabSnapshot["connectionState"]): string {
  switch (state) {
    case "ready":
      return "Ready";
    case "selection-required":
      return "Selection required";
    case "partial":
      return "Partial";
    default:
      return "Offline";
  }
}

function connectionStateIcon(state: VisionLabSnapshot["connectionState"]): string {
  switch (state) {
    case "ready":
      return "●";
    case "selection-required":
      return "◆";
    case "partial":
      return "▲";
    default:
      return "○";
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function styles(compact: boolean): string {
  const pad = compact ? "10px 12px" : "16px 20px";
  return `
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-editor-background);margin:0;padding:${pad};line-height:1.45}
main{max-width:${compact ? "100%" : "960px"};margin:0 auto}
h1{font-size:1.15em;margin:0 0 4px}
h2{font-size:1em;margin:0 0 8px;color:var(--vscode-foreground)}
h3{font-size:.95em;margin:0 0 6px}
.meta,.hint,.placeholder{opacity:.85;font-size:.92em}
.section{border:1px solid var(--vscode-panel-border);border-radius:6px;padding:12px 14px;margin:0 0 12px;background:var(--vscode-editor-background)}
.status{display:flex;gap:8px;align-items:flex-start}
.status-icon{width:1.2em;font-family:monospace}
.list,.sublist{list-style:none;padding:0;margin:8px 0 0}
.list li,.sublist li{padding:6px 0;border-top:1px solid var(--vscode-panel-border)}
.list li:first-child,.sublist li:first-child{border-top:none;padding-top:0}
.mono{font-family:var(--vscode-editor-font-family,monospace);font-size:.92em}
.badge{display:inline-block;margin-left:6px;padding:1px 6px;border:1px solid var(--vscode-badge-background);border-radius:4px;font-size:.78em;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
.reach{font-size:.78em;margin-left:6px;padding:1px 6px;border-radius:4px;border:1px solid var(--vscode-panel-border)}
.reach-reachable{border-color:var(--vscode-charts-green)}
.reach-unreachable{border-color:var(--vscode-charts-red)}
.reach-not-probed,.reach-skipped{opacity:.8}
.warn{color:var(--vscode-errorForeground)}
.errors strong,.warnings strong,.diagnostics strong{display:block;margin-bottom:4px}
.provider-card{padding:8px 0;border-top:1px solid var(--vscode-panel-border)}
.provider-card:first-of-type{border-top:none;padding-top:0}
a{color:var(--vscode-textLink-foreground);text-decoration:none}
a:hover{text-decoration:underline}
.action{display:inline-block;margin-top:4px}
.overlay-frame{border:1px solid var(--vscode-panel-border);border-radius:6px;padding:8px;margin:8px 0;background:var(--vscode-editor-inactiveSelectionBackground)}
.overlay-svg{width:100%;max-width:420px;aspect-ratio:4/3;display:block;background:var(--vscode-textBlockQuote-background)}
.inspector-table{width:100%;border-collapse:collapse;font-size:.92em;margin:8px 0}
.inspector-table th,.inspector-table td{border:1px solid var(--vscode-panel-border);padding:6px 8px;text-align:left;vertical-align:top}
.inspector-table.metrics th{width:40%}
.raw-json{overflow:auto;max-height:240px;font-family:var(--vscode-editor-font-family,monospace);font-size:.85em;padding:8px;border:1px solid var(--vscode-panel-border);border-radius:4px;background:var(--vscode-textBlockQuote-background)}
@media (max-width: 640px){body{padding:10px}.section{padding:10px}}
`;
}

export { escapeHtml } from "./vision-lab-text.js";
