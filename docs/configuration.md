# Configuration

Optional project file:

```text
.ftc-dev.json
```

The tools work with **no config file**. Defaults are applied automatically.

## Example

```json
{
  "$schema": "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/ftc-dev.schema.json",
  "teamNumber": 12345,
  "module": "TeamCode",
  "deployment": {
    "preferredConnection": "wifi",
    "preferredDeviceSerial": ""
  },
  "logs": {
    "defaultFilter": "teamcode"
  }
}
```

## Rules

- Unknown properties produce **warnings**, not crashes
- Invalid values produce validation errors
- Never store passwords, Wi-Fi credentials, API keys, or tokens
- `preferredDeviceSerial` is a **machine-local** preference; avoid committing real serials to shared repos when possible
- `preferredConnection` (`usb` | `wifi` | `any`) narrows automatic device selection only. It never silently picks among multiple matches. Explicit `--device` / preferred serial always wins.

## Team-shared vs local editor settings

| Setting                                     | Suggested location                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `module`, `logs.defaultFilter`, team number | `.ftc-dev.json` (team-shared, non-secret)                                 |
| Preferred device serial for one laptop      | VS Code/Cursor setting `ftc.preferredDeviceSerial` (workspace/user local) |

The schema lives in `packages/shared/schemas/ftc-dev.schema.json`. The published `$schema` URL points at the `main` branch of `The-Allsparks/ftc-dev-tools`.
