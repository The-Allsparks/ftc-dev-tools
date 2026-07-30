import { describe, expect, it } from "vitest";
import { VISION_INSPECTOR_CAPABILITIES } from "@ftc-dev-tools/shared";
import type { VisionLabSnapshot } from "../src/vision-lab-data.js";
import { escapeHtml, renderVisionLabHtml } from "../src/vision-lab-html.js";

function minimalSnapshot(overrides: Partial<VisionLabSnapshot> = {}): VisionLabSnapshot {
  return {
    generatedAt: "2026-07-30T00:00:00.000Z",
    connectionState: "offline",
    connectionLabel: "No project open",
    errors: [],
    providers: [
      {
        id: "vision:limelight",
        displayName: "Limelight",
        kind: "limelight",
        integrationId: "limelight",
        frameProviderId: "frame:limelight",
        summary: "Limelight Vision",
        experimental: false,
      },
    ],
    providerSections: [],
    sourceLinks: [],
    ...overrides,
  };
}

describe("renderVisionLabHtml", () => {
  it("includes CSP, ARIA labels, and connection text", () => {
    const html = renderVisionLabHtml(
      minimalSnapshot({
        connectionState: "selection-required",
        connectionLabel: "Pick a host in .ftc-dev.json",
      }),
    );
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain('role="main"');
    expect(html).toContain("Selection required");
    expect(html).toContain("Pick a host in .ftc-dev.json");
    expect(html).toContain("Result inspector");
    expect(html).toContain("Sidebar view stays offline-only");
  });

  it("renders inspector overlay and copy link when results are loaded", () => {
    const html = renderVisionLabHtml(
      minimalSnapshot({
        resultInspector: {
          providerId: "vision:limelight",
          providerLabel: "Limelight",
          host: "limelight.local",
          reachable: true,
          stale: false,
          requiresSelection: false,
          message: "Targeting results loaded.",
          overlayConvention: "Normalized frame space",
          selectedTarget: {
            id: "limelight-primary",
            label: "Primary target",
            valid: true,
            txDegrees: 1,
            tyDegrees: 2,
            areaPercent: 4,
            overlay: [
              { kind: "crosshair", point: { x: 0.5, y: 0.5 } },
              { kind: "target-point", point: { x: 0.52, y: 0.46 } },
            ],
          },
          detections: [
            {
              id: "limelight-primary",
              label: "Primary target",
              valid: true,
              txDegrees: 1,
              tyDegrees: 2,
              areaPercent: 4,
              overlay: [{ kind: "target-point", point: { x: 0.52, y: 0.46 } }],
            },
          ],
          metrics: {
            fps: 30,
            captureLatencyMs: null,
            pipelineLatencyMs: 8,
            totalLatencyMs: null,
            frameAgeMs: null,
            cpuPercent: null,
            temperatureCelsius: null,
          },
          rawPayload: { tl: { valid: true } },
          capabilities: { ...VISION_INSPECTOR_CAPABILITIES },
          generatedAt: "2026-07-30T00:00:00.000Z",
        },
      }),
      { copyInspectorCommand: "ftc.visionCopyInspectorJson" },
    );

    expect(html).toContain('aria-label="Normalized overlay preview without live video"');
    expect(html).toContain("Detections");
    expect(html).toContain("command:ftc.visionCopyInspectorJson");
    expect(html).toContain("Raw provider payload");
  });

  it("renders provider errors without throwing", () => {
    const html = renderVisionLabHtml(
      minimalSnapshot({
        providerSections: [
          {
            providerId: "vision:limelight",
            label: "Limelight",
            message: "Host unresolved",
            error: "Network timeout",
            details: ["Host: limelight.local"],
          },
        ],
      }),
    );
    expect(html).toContain("Network timeout");
    expect(html).toContain("limelight.local");
  });

  it("escapes unsafe workspace content", () => {
    const html = renderVisionLabHtml(
      minimalSnapshot({
        errors: ["<script>alert(1)</script>"],
      }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain(escapeHtml("<script>alert(1)</script>"));
  });

  it("adds compact sidebar open-panel link", () => {
    const html = renderVisionLabHtml(minimalSnapshot(), {
      compact: true,
      openPanelCommand: "ftc.openVisionLab",
    });
    expect(html).toContain("command:ftc.openVisionLab");
    expect(html).toContain("Open full Vision Lab panel");
  });

  it("renders replay section with deferred capture capabilities", () => {
    const html = renderVisionLabHtml(
      minimalSnapshot({
        replayStatus: {
          generatedAt: "2026-07-30T00:00:00.000Z",
          message: "Replay foundation only.",
          headerSchemaVersion: "1.0.0",
          eventSchemaVersion: "1.0.0",
          sessionSchemaUrl: "https://example/session.schema.json",
          eventSchemaUrl: "https://example/session-event.schema.json",
          capabilities: {
            sessionHeaderValidation: true,
            sessionEventValidation: true,
            sessionManifest: true,
            liveCapture: false,
            offlineReplay: false,
            frameCapture: false,
            annotatedFrameCapture: false,
            exportBundle: false,
            redaction: false,
            visionLabControls: false,
          },
          limits: {
            maxDurationMs: 1_800_000,
            maxTotalBytes: 500_000_000,
            maxEventPayloadBytes: 65_536,
            maxEvents: 100_000,
          },
          gitignoreRecommendations: [".ftc-sessions/"],
          replayBackends: [],
          humanSummary: [],
        },
      }),
    );

    expect(html).toContain("Live camera &amp; replay");
    expect(html).toContain("liveCapture=no");
  });
});
