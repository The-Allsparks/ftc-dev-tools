# Vision result inspector (VISION-11)

Structured inspection of vision provider results in the Vision Lab panel. This milestone adds shared snapshot builders and a read-only webview section — live video overlays, metric graphs, export files, and configurable thresholds remain deferred.

## Shared API

`packages/shared/src/vision/inspector/`:

| Export                                | Purpose                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `buildVisionInspectorSnapshot()`      | Resolve Limelight host, fetch results/status, return normalized snapshot |
| `buildLimelightInspectorSnapshot()`   | Map Limelight targeting results to overlay + metrics                     |
| `emptyInspectorSnapshot()`            | Selection-required or error placeholder                                  |
| `limelightDegreesToNormalizedPoint()` | tx/ty degrees → normalized [0,1] frame coordinates                       |
| `VISION_INSPECTOR_CAPABILITIES`       | Feature flags (`liveVideoOverlay: false`, etc.)                          |

Host selection follows the same rules as other Limelight tools: multiple hosts without an explicit `vision.limelight.host` yields `requiresSelection: true` — no silent auto-pick.

## Overlay convention

Normalized frame space: `x`/`y` in `[0,1]`, origin top-left. Limelight `tx`/`ty` (degrees from crosshair, +Y up in robot space) map relative to image center using default FOV 59.2° × 45.7°.

The VS Code panel renders an SVG preview (crosshair, target point, approximate area box) without live video.

## Vision Lab panel

- Full panel refresh (`loadResults: true`) loads the inspector when Limelight is configured or detected in TeamCode.
- Activity-bar sidebar stays offline-only (placeholder text, no network fetch).
- **Copy as JSON** (`ftc.visionCopyInspectorJson`) copies the last loaded snapshot via command URI + clipboard (no webview scripts).

Unavailable numeric metrics display `—` rather than zero.

## Deferred (VISION-11+)

- Live video aligned with overlay
- Time-series metric graphs
- Export to file
- Configurable detection thresholds

## Related

- [Vision Lab panel](./vision-lab-panel.md)
- [VISION-11 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/59)
