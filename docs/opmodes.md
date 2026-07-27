# OpModes

Phase 6a adds OpMode list/create helpers so teams can scaffold TeleOp and Autonomous classes in Cursor/VS Code without Android Studio’s new-file wizard.

## Commands

```bash
ftc opmode list [--json]
ftc opmode create <ClassName> --type teleop|autonomous [--iterative] [--group NAME] [--name DISPLAY] [--dry-run|--yes] [--force]
```

## Create examples

```bash
ftc opmode create MyTeleOp --type teleop --yes
ftc opmode create BlueAuto --type autonomous --group auto --yes
ftc opmode create ArcadeDrive --type teleop --iterative --dry-run
```

Defaults:

| Setting | Default |
| --- | --- |
| Style | `LinearOpMode` (`--iterative` for classic `OpMode`) |
| Package | `org.firstinspires.ftc.teamcode` |
| Display name | class name |
| Path | `TeamCode/src/main/java/org/firstinspires/ftc/teamcode/<Class>.java` |

## Safety

- Requires `--yes` (or TTY / modal confirm)
- Refuses overwrite unless `--force` (backup under `.ftc-dev-tools/backups/opmode-*`)
- Dirty git tree refused unless `--force`
- Never writes outside TeamCode java tree

## Extension

- **FTC: List OpModes**
- **FTC: Create OpMode** (type + style QuickPick, opens the new file)

## Next Studio-parity slices

- **6b** Robot config XML helpers — see [robot-config.md](robot-config.md)
- **6c** Hardware map inspect + codegen from config
