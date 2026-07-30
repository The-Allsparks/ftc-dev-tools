# VisionPortal

Static analysis of **VisionPortal** usage in TeamCode — webcam names, processors, and bridge integration hints. Does not start camera streams from the desktop.

## Configure

1. Add webcam in **Robot Configuration** (`WebcamName` in XML).
2. Use VisionPortal in TeamCode (official FTC SDK samples).
3. Scan:

```bash
ftc vision discover --json
ftc vision visionportal status --json
```

## Scaffold Java (optional)

```bash
ftc vision codegen visionportal --class AprilTagTele --yes
```

Uses AprilTag-oriented template — adjust processors for your season.

## Diagnostic bridge

Optional robot-side JSON over Logcat (`FTC_VISION_DIAG:` prefix):

```bash
ftc vision bridge status --json
ftc vision bridge scaffold --yes --dry-run
ftc vision bridge scaffold --yes
```

See [architecture/vision-diagnostic-bridge.md](./architecture/vision-diagnostic-bridge.md).

## MCP

`vision_visionportal_status`, agent read-only tools via `vision_get_status` / diagnostics.

## Supported FTC SDK

VisionPortal APIs follow your project's SDK version (`ftc sdk check`). Vision Lab does not bundle SDK JARs.

## Troubleshooting

| Symptom                   | Steps                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| Webcam not listed         | Run `ftc config show`; verify XML name matches code                   |
| Selection required        | Multiple webcams in config — specify camera in codegen `--camera`     |
| VisionPortal not detected | Add SDK dependency in Gradle; check `ftc vision discover`             |
| No live desktop preview   | Expected — desktop preview is deferred; use Driver Hub or Dashboard   |
| Bridge missing            | Run `ftc vision bridge scaffold --yes` if you want Logcat diagnostics |

## Related

- [VisionPortal integration (architecture)](./architecture/vision-portal-integration.md)
- [Snippets](./snippets.md) — `ftc-vision`, `ftc-apriltag`
