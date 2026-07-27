# Hardware map

Bridges robot config XML to code: inspect name → type mappings and generate a new OpMode with `hardwareMap.get(...)` stubs (similar to OnBot Java’s hardware helpers).

## Commands

```bash
ftc hwmap show [--config NAME] [--json]
ftc hwmap codegen <ClassName> [--config NAME] [--type teleop|autonomous] [--iterative] [--dry-run|--yes] [--force]
```

## Show

```bash
ftc hwmap show
ftc hwmap show --config my_robot
```

- Reads `TeamCode/src/main/res/xml`
- If exactly one robot config exists, `--config` is optional
- If multiple exist, `--config` is required
- Hub/module entries (e.g. `LynxModule`) are listed but marked `[skip codegen]`

## Codegen

```bash
ftc hwmap codegen ConfigTele --config my_robot --yes
ftc hwmap codegen BlueAuto --config my_robot --type autonomous --dry-run
```

Creates a **new** OpMode under TeamCode with:

- Private fields for mapped devices (`DcMotor`, `Servo`, `IMU`, …)
- Matching `hardwareMap.get(Type.class, "configName")` calls in `runOpMode` / `init`

Safety (same conventions as `ftc opmode create`):

- Requires `--yes` (or TTY / modal confirm)
- Refuses overwrite unless `--force` (backup under `.ftc-dev-tools/backups/hwmap-*`)
- Dirty git tree refused unless `--force`
- Never rewrites arbitrary existing OpModes without an explicit class path + `--force`

## Mapped XML types (common)

| Config XML                | Java type        |
| ------------------------- | ---------------- |
| `Motor`                   | `DcMotor`        |
| `Servo`                   | `Servo`          |
| `ContinuousRotationServo` | `CRServo`        |
| `LynxEmbeddedIMU` / `IMU` | `IMU`            |
| `DigitalDevice`           | `DigitalChannel` |
| `Webcam`                  | `WebcamName`     |

Unknown tags appear in `show` as unmapped and are skipped by codegen.

## Extension

- **FTC: Show Hardware Map**
- **FTC: Generate OpMode from Config**

## Related

- [Robot configuration](robot-config.md) (Phase 6b)
- [OpModes](opmodes.md) (Phase 6a)
- [MCP server](mcp.md) (Phase 7)
