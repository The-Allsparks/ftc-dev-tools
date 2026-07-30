# Vision diagnostic bridge (VISION-07)

Optional robot-side helper for **Vision Lab** when desktop tools cannot observe camera processor state directly. The bridge emits **structured JSON diagnostics only** — never motor commands, raw frames, or arbitrary file access.

## What desktop tools cannot see today

| Signal                               | Limelight (HTTP) | FTC Dashboard | Logcat | Bridge          |
| ------------------------------------ | ---------------- | ------------- | ------ | --------------- |
| VisionPortal camera lifecycle        | —                | partial       | —      | yes             |
| Processor enabled/disabled           | —                | partial       | —      | yes             |
| AprilTag / color processor summaries | —                | partial       | —      | yes (VISION-08) |
| UVC exposure / gain / focus          | —                | —             | —      | yes (VISION-08) |

Prefer **existing transports** before inventing sockets:

1. **Logcat** — primary; lines prefixed with `FTC_VISION_DIAG:` carry schema-validated JSON
2. **FTC Dashboard telemetry** — when dependency is present (VISION-06)
3. **Robot Controller web console** — reachability only (VISION-03)

A dedicated TCP/WebSocket protocol is **deferred** until Logcat and Dashboard paths are insufficient.

## Payload schema

Version **1.0.0** — [`packages/shared/schemas/vision-diagnostic.schema.json`](../../packages/shared/schemas/vision-diagnostic.schema.json)

Required fields: `schemaVersion`, `sessionId`, `sequence`, `timestampMs`, `bridgeVersion`.

Optional: `camera`, `processors[]`, `warnings[]`.

Hard limits (enforced in generated Java):

| Limit             | Value            |
| ----------------- | ---------------- |
| Max payload size  | 4096 bytes UTF-8 |
| Min emit interval | 200 ms (5 Hz)    |
| Max processors    | 16               |
| Max warnings      | 8                |

## Safety constraints

- **No robot control** — diagnostic OpMode does not read gamepad input or set motor power
- **Explicit lifecycle** — bridge session starts when the diagnostic OpMode runs
- **Version handshake** — desktop validates `schemaVersion` and `bridgeVersion`; mismatches produce warnings
- **Optional** — teams may delete scaffolded files; Vision Lab degrades gracefully
- **No silent selection** — multiple robots/cameras still require explicit `--host` / device pick (VISION-03)

## Generated TeamCode files

Scaffold creates (default package `org.firstinspires.ftc.teamcode.vision`):

| File                             | Role                                 |
| -------------------------------- | ------------------------------------ |
| `FtcVisionDiagnosticBridge.java` | Rate-limited JSON emitter to Logcat  |
| `FtcVisionDiagnosticOpMode.java` | Development TeleOp; no motor control |

VISION-08 wires VisionPortal snapshot helpers into the bridge utility when TeamCode uses VisionPortal.

Run `ftc vision visionportal status` for static configuration hints, then re-scaffold the bridge with `--force` after adding VisionPortal to your project.

## Surfaces

```bash
ftc vision bridge status --json
ftc vision bridge scaffold --yes --json
```

MCP: `vision_bridge_status`, `vision_bridge_scaffold` (scaffold requires `yes=true`).

## Related

- [Vision providers](./vision-providers.md)
- [VISION-07 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/55)
- [VISION-08 VisionPortal integration](https://github.com/The-Allsparks/ftc-dev-tools/issues/56)
- [ADR-0005](./adr/0005-versioned-shared-schemas.md) — versioned shared schemas
