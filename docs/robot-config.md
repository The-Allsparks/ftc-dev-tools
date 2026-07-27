# Robot configuration XML

Phase 6b adds helpers to list, inspect, validate, and pull FTC robot configuration XML so teams can work with Driver Station configs from Cursor/VS Code without Android Studio’s config editor.

## Commands

```bash
ftc config list [--json]
ftc config show <name-or-path> [--json]
ftc config validate <name-or-path> [--json]
ftc config pull [--device SERIAL] [--name FILE] [--dry-run|--yes]
```

## Project configs

Configs live under:

`TeamCode/src/main/res/xml/*.xml`

Rules:

- Only files with a root `<Robot>` element are treated as robot configs
- `teamwebcamcalibrations.xml` is skipped
- Show / validate accept a base name (`my_robot`) or a path under the project

## Pull from hub

```bash
ftc config pull --dry-run
ftc config pull --yes
ftc config pull --device SERIAL --name my_robot --yes
```

- Remote directory: `/sdcard/FIRST`
- Destination: `TeamCode/src/main/res/xml`
- Requires `--yes` (or TTY confirm); `--dry-run` only lists remote XML
- Does **not** push or activate a configuration on the hub

## Validation checks

- Android `res/xml` resource file name (`[a-z0-9_]+`)
- Root `<Robot>` present; `type` attribute recommended
- Duplicate device/module `name` attributes → error
- Unusual device names → warning (hardwareMap is case-sensitive)

## Extension

- **FTC: List Robot Configs**
- **FTC: Show Robot Config**
- **FTC: Validate Robot Config**
- **FTC: Pull Robot Configs** (modal confirm)

## Next Studio-parity slice

- **6c** Hardware map inspect + codegen from config XML
- Then **Phase 7** MCP server
