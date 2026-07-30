# Vision diagnostics (VISION-14)

Foundation for student-friendly vision setup diagnostics. Aggregates existing workspace discovery, endpoint probing, Limelight artifact validation, and bridge status into stable codes — without blocking `doctor` readiness.

## Diagnostic codes

| Code                                 | Severity (typical) | Source                                                       |
| ------------------------------------ | ------------------ | ------------------------------------------------------------ |
| `VISION_PROJECT_UNSUPPORTED`         | error              | Not an official FTC project layout                           |
| `VISION_NO_LIBRARIES`                | warn               | No VisionPortal / EasyOpenCV / Limelight / Dashboard signals |
| `VISION_DEFAULT_PROVIDER_MISMATCH`   | warn               | `.ftc-dev.json` defaultProviderId vs discovery               |
| `VISION_CONFIG_ERROR`                | error              | Invalid vision section in `.ftc-dev.json`                    |
| `VISION_CAMERA_NOT_CONFIGURED`       | warn               | VisionPortal import without camera/processor details         |
| `VISION_HARDWARE_NAME_MISMATCH`      | warn               | VisionPortal camera name vs robot_config webcams             |
| `VISION_ENDPOINT_AMBIGUOUS`          | warn               | Multiple endpoints require explicit selection                |
| `VISION_HOST_UNREACHABLE`            | warn               | Network probe failed for discovered hosts                    |
| `VISION_LIMELIGHT_HOST_UNRESOLVED`   | warn               | Limelight host resolution requires selection                 |
| `VISION_SELECTION_REQUIRED`          | warn               | Multiple VisionPortal targets                                |
| `VISION_DASHBOARD_URL_AMBIGUOUS`     | warn               | Multiple dashboard URLs                                      |
| `VISION_DASHBOARD_UNREACHABLE`       | warn               | Dashboard URL probe failed                                   |
| `VISION_BRIDGE_NOT_SCAFFOLDED`       | info               | Optional diagnostic bridge not present                       |
| `VISION_PIPELINE_ARTIFACT_ERROR`     | error/warn         | Limelight pipeline JSON validation                           |
| `VISION_COMPETITION_NETWORK_CAUTION` | info (likely)      | Robot route present — bandwidth caution                      |

Heuristic diagnostics use confidence `likely` and do not block deploy readiness.

## Surfaces

| Surface | Entry                                                                   |
| ------- | ----------------------------------------------------------------------- |
| CLI     | `ftc vision diagnostics [--json] [--no-probe]`                          |
| MCP     | `vision_diagnostics` (read-only)                                        |
| Doctor  | Optional **Vision setup** section — three checks, all `required: false` |
| Errors  | `interpretError` rules for all `VISION_*` codes                         |

## Module layout

```
packages/shared/src/vision/diagnostics/
  codes.ts          # Stable code constants
  types.ts          # VisionDiagnostic, report types
  capabilities.ts   # Deferred features (live heuristics, logcat, export)
  friendly.ts       # Code → FriendlyError mapping
  collect.ts        # collectVisionDiagnostics()
  doctor.ts         # buildVisionDoctorChecks()
```

## Doctor behavior

Vision checks never affect `report.ready` or required readiness sets. Network probes run when adb device listing is available (same as `ftc vision devices`); otherwise the network check is skipped with an explanatory detail.

## Deferred (follow-up issues)

- Live image heuristics (exposure, motion blur)
- Logcat bridge parsing
- Diagnostic bundle export
- Vision Lab panel integration for inline diagnostics

## Related

- [Vision providers](./vision-providers.md)
- Epic [#48](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)
- Issue [#62](https://github.com/The-Allsparks/ftc-dev-tools/issues/62)
