# Vision diagnostics

Aggregated setup checks with stable **`VISION_*` codes** and student-friendly suggested actions.

Technical reference: [architecture/vision-diagnostics.md](./architecture/vision-diagnostics.md)

## Run diagnostics

```bash
ftc vision diagnostics
ftc vision diagnostics --json
ftc vision diagnose --json --redact   # alias with redaction flag
```

Skip network probes when offline:

```bash
ftc vision diagnostics --no-probe
```

Doctor optionally includes a **Vision setup** section (never blocks overall readiness):

```bash
ftc doctor --json
```

## MCP

- Legacy: `vision_diagnostics`
- Agent alias: `vision_get_diagnostics`

## What it checks

- `.ftc-dev.json` vision section validity
- Gradle / TeamCode vision library signals
- Pipeline directory and JSON issues (when configured)
- Endpoint reachability (when probing enabled and ADB devices present)
- Ambiguous multi-device / multi-host conditions

## Example workflow

1. `ftc vision diagnostics --json --redact`
2. Fix errors first (severity `error`), then warnings
3. Re-run until `summary.errorCount` is zero
4. If hardware still fails, follow provider troubleshooting in [Limelight](./limelight.md) or [VisionPortal](./visionportal.md)

## Not included yet

- Live image quality heuristics
- Logcat vision tag parsing
- One-click diagnostic bundle export
