# Vision hardware validation (VISION-17)

Automated tests in CI prove **mock-tested** behavior only. Physical hardware validation is tracked separately and must pass before any Vision Lab feature is labeled beyond `Mock-tested`.

## Principles

1. **Mock-tested ≠ hardware validated** — green CI does not imply Control Hub, Limelight, or webcam validation.
2. **No auto-selection** — when multiple hosts, cameras, or ADB devices are present, tools require explicit user/agent selection.
3. **Checklist-driven maturity** — update [feature-maturity.md](../feature-maturity.md) only after a maintainer records a passing hardware report (no PII).

## Automated coverage (CI)

The shared module `packages/shared/src/vision/validation/` reports which areas have automated tests:

| Area                   | Test focus                                   |
| ---------------------- | -------------------------------------------- |
| Provider registry      | Vision providers linked to frame providers   |
| Capability negotiation | Provider capability flags                    |
| Configuration schema   | `.ftc-dev.json` vision config                |
| Ambiguous discovery    | Multi-device / multi-host selection required |
| Probe timeout / cancel | Network probe abort and timeout              |
| Malformed Limelight    | Bad JSON / missing fields normalized safely  |
| Stale results          | Limelight latency staleness                  |
| Dashboard detection    | Gradle dependency scan                       |
| VisionPortal bridge    | Bridge scaffold status                       |
| EasyOpenCV detection   | Gradle + TeamCode scan                       |
| Pipeline artifacts     | Scan / validate / diff                       |
| Session schema         | Header + event validation                    |
| Corrupt sessions       | Oversized / bad schema rejected              |
| MCP redaction          | Sensitive keys stripped                      |
| Cross-platform paths   | Relative paths in reports                    |

Run locally:

```bash
npm run test --workspace=@ftc-dev-tools/shared -- vision-validation
```

## Surfaces

| Surface | Command / tool                          |
| ------- | --------------------------------------- |
| CLI     | `ftc vision validation status [--json]` |
| MCP     | `vision_validation_status` (read-only)  |

Example:

```bash
ftc vision validation status --json
```

## Physical validation matrix

Each row in `getVisionValidationStatus()` starts as `pending`. Maintainers execute checklists on real hardware and update status in source (or a future report file) when passes are recorded.

### Windows

- USB ADB — REV Control Hub + Limelight 3A (`/status`, `/results`, pipeline diff read-only)
- Wi-Fi ADB — same Limelight flows over wireless debugging
- Dual-NIC — Limelight reachable on robot radio subnet while desktop stays on field network
- USB — VisionPortal UVC webcam configured in robot config

### macOS

- USB ADB — Control Hub + Limelight 3A
- Wi-Fi ADB — FTC Dashboard camera stream in browser

### Linux

- USB ADB — Control Hub + Limelight 3A
- Wi-Fi ADB — EasyOpenCV webcam pipeline on robot

### All platforms

- Disconnect recovery (ADB drop, Limelight power cycle)
- Multi-device explicit selection (never auto-pick)
- Malformed pipeline JSON and corrupt session files handled gracefully
- Long replay / low-disk (blocked until live capture ships)

## Hardware test report template

Use the template in [feature-maturity.md](../feature-maturity.md). Store reports in maintainer-private notes or team wiki — do not commit PII to the public repo.

```text
Feature:
Host OS:
Connection (USB / Wi-Fi ADB):
Device type (Control Hub / phone RC / Limelight / webcam):
FTC SDK version:
Hub OS version (if applicable):
Checklist id (from validation status JSON):
Result (pass / fail / partial):
Known limitations:
Tester role (maintainer / external team — no personal name):
Test date (YYYY-MM-DD):
```

## Deferred (not in VISION-17 foundation)

- Webview disposal / extension UI integration tests
- Generated Java compilation on robot hardware in CI
- Live session capture and long replay on device
- Limelight upload / activate on hardware

## Related

- [Vision providers](./vision-providers.md)
- [Feature maturity](../feature-maturity.md)
- [Vision Lab epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)
- [VISION-17 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/65)
