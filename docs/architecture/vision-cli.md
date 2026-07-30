# Vision CLI (VISION-15)

Canonical command surface for Vision Lab scripting, shell completion metadata, and stable JSON envelopes.

## Schema version

Machine-readable output uses envelope `schemaVersion: "1.0.0"` via `wrapVisionCliJson`:

```json
{
  "schemaVersion": "1.0.0",
  "command": "ftc vision devices",
  "generatedAt": "2026-07-30T16:00:00.000Z",
  "redacted": false,
  "data": {}
}
```

Pass `--redact` to mask IP addresses and adb serial numbers in JSON output.

## Exit codes

| Code | Meaning                                         |
| ---- | ----------------------------------------------- |
| 0    | Success                                         |
| 1    | Validation or unexpected error                  |
| 2    | Selection required (multiple endpoints/devices) |
| 3    | Target unreachable                              |
| 4    | Deferred command (cataloged, not implemented)   |

## Shared flags

These flags are supported on network-aware commands (`open`, `devices`, provider subcommands):

| Flag                  | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `--provider <id>`     | `vision:limelight`, `telemetry:ftc-dashboard`, or inferred  |
| `--endpoint <id>`     | Explicit endpoint id from `ftc vision devices --json`       |
| `--host <address>`    | Limelight or robot host                                     |
| `--url <address>`     | Full dashboard URL                                          |
| `--device <serial>`   | adb serial (never auto-selected)                            |
| `--timeout <ms>`      | Network probe timeout                                       |
| `--redact`            | Redact sensitive fields in JSON                             |
| `--json`              | Stable machine-readable output                              |
| `--no-probe`          | Skip HTTP reachability checks                               |
| `--dry-run` / `--yes` | Mutation confirmation (codegen, bridge, deferred pipelines) |

## Command catalog

Run `ftc vision catalog` or `ftc vision catalog --json` for the full list of available and deferred commands.

Top-level shortcuts added in VISION-15:

| Command                                                                     | Notes                                    |
| --------------------------------------------------------------------------- | ---------------------------------------- |
| `ftc vision diagnose`                                                       | Alias for `diagnostics`                  |
| `ftc vision open`                                                           | Open Limelight web UI or FTC Dashboard   |
| `ftc vision pipelines list\|validate\|compare`                              | Shortcuts for Limelight pipeline-as-code |
| `ftc vision codegen limelight\|easyopencv\|visionportal\|diagnostic-opmode` | Codegen shortcuts                        |

Deferred commands (exit code 4): `capture`, `pipelines pull|push|activate|reload`, all `sessions *`.

## Module layout

```
packages/shared/src/vision/cli/
  constants.ts   # schema version + exit codes
  catalog.ts     # command catalog
  format.ts      # JSON envelope + tables + redaction
  open.ts        # openVisionTarget()
  deferred.ts    # deferred command helper
```

## Related

- [Vision providers](./vision-providers.md)
- [Vision diagnostics](./vision-diagnostics.md)
- Issue [#63](https://github.com/The-Allsparks/ftc-dev-tools/issues/63)
