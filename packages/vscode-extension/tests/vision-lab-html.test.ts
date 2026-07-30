import { describe, expect, it } from "vitest";
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
    expect(html).toContain("Live camera streaming");
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
});
