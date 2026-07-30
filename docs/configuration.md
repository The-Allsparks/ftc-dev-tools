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
  },
  "vision": {
    "defaultProviderId": "vision:limelight",
    "enabledProviderIds": ["vision:limelight", "vision:visionportal"],
    "pipelineDirectory": "limelight/pipelines",
    "limelight": {
      "host": "limelight.local",
      "pipelineDirectory": "limelight/pipelines"
    }
  }
}
```

## Rules

- Unknown properties produce **warnings**, not crashes
- Invalid values produce validation errors
- Never store passwords, Wi-Fi credentials, API keys, or tokens
- `preferredDeviceSerial` is a **machine-local** preference; avoid committing real serials to shared repos when possible
- `preferredConnection` (`usb` | `wifi` | `any`) narrows automatic device selection only. It never silently picks among multiple matches. Explicit `--device` / preferred serial always wins.

## Vision configuration (Vision Lab)

Optional `vision` section configures Vision Lab provider preferences:

| Field                         | Purpose                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| `defaultProviderId`           | Preferred provider id from `ftc providers list` (e.g. `vision:limelight`) |
| `enabledProviderIds`          | Providers enabled for this project                                        |
| `pipelineDirectory`           | Repo-relative pipeline-as-code root                                       |
| `limelight.host`              | Limelight Vision hostname or IP (never store secrets here)                |
| `limelight.pipelineDirectory` | Limelight Vision pipeline JSON directory                                  |

Discover what the project uses:

```bash
ftc vision discover --json
ftc vision status --json
ftc vision devices --json   # endpoint discovery + optional network probes
ftc vision limelight status --json
ftc vision limelight results --json
ftc vision limelight pipelines list --json
ftc vision limelight pipelines validate --json
ftc vision limelight pipelines diff --slot 0 --json
```

See [vision-providers.md](architecture/vision-providers.md).

## Team-shared vs local editor settings

| Setting                                     | Suggested location                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `module`, `logs.defaultFilter`, team number | `.ftc-dev.json` (team-shared, non-secret)                                 |
| Preferred device serial for one laptop      | VS Code/Cursor setting `ftc.preferredDeviceSerial` (workspace/user local) |

The schema lives in `packages/shared/schemas/ftc-dev.schema.json`. The published `$schema` URL points at the `main` branch of `The-Allsparks/ftc-dev-tools`.
