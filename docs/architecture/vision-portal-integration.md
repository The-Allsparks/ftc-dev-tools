# VisionPortal integration (VISION-08)

Desktop-side VisionPortal support for Vision Lab: static TeamCode analysis, robot-config cross-reference, bridge snapshot helpers, and normalized processor result shapes. Runtime camera controls and live UVC mutations remain deferred.

## CLI

```bash
ftc vision visionportal status --json
```

Reports:

- VisionPortal init pattern (`builder`, `easyInitialize`, or unknown)
- Configured camera name (when discoverable from source)
- Resolution and `StreamFormat`
- Registered processors (AprilTag, color, TFOD, generic)
- Robot configuration webcams from `TeamCode/src/main/res/xml/*.xml`
- Whether explicit camera/OpMode selection is required (never auto-selects)

## MCP

| Tool                         | CLI equivalent                          |
| ---------------------------- | --------------------------------------- |
| `vision_visionportal_status` | `ftc vision visionportal status --json` |

## Bridge integration

When VisionPortal is configured in TeamCode, `ftc vision bridge status` sets `capabilities.liveVisionPortalDiagnostics` to `true`.

Re-scaffold the diagnostic bridge after adding VisionPortal to include snapshot helpers:

```bash
ftc vision bridge scaffold --yes --force --json
```

Generated Java includes `cameraFromPortal()` and `processorsFromPortal()` on `FtcVisionDiagnosticBridge`. Assign your team's `VisionPortal` instance in the diagnostic OpMode.

## Capabilities (foundation)

| Capability                             | Status                                       |
| -------------------------------------- | -------------------------------------------- |
| Static TeamCode scan                   | yes                                          |
| Bridge processor enabled state         | yes (via bridge payloads)                    |
| AprilTag / color result normalization  | yes (summary parsing)                        |
| Custom processor adapters              | yes (`registerVisionPortalProcessorAdapter`) |
| UVC exposure / gain / focus / WB / PTZ | deferred                                     |
| Streaming start/stop actions           | deferred                                     |
| Processor enable/disable mutations     | deferred                                     |
| Multi-camera switch                    | detection only; explicit selection required  |

## Safety

- Multiple cameras or ambiguous VisionPortal targets set `requiresSelection` — tools do not pick a default.
- Camera control mutations require explicit future CLI/MCP flags with `--yes`.
- Diagnostic bridge remains development-only; never a Driver Station substitute.

## Related

- [Vision diagnostic bridge](./vision-diagnostic-bridge.md)
- [Vision providers](./vision-providers.md)
- [VISION-08 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/56)
