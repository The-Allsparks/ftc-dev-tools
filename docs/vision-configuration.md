# Vision configuration

Vision Lab reads optional settings from `.ftc-dev.json` at the FTC project root. The tools work with **no config file**.

See also [Configuration](./configuration.md) for deployment, logs, and schema URL.

## Minimal Limelight example

```json
{
  "$schema": "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/ftc-dev.schema.json",
  "teamNumber": 916,
  "vision": {
    "defaultProviderId": "vision:limelight",
    "limelight": {
      "host": "10.9.16.11",
      "pipelineDirectory": "limelight/pipelines"
    }
  }
}
```

## Minimal webcam / VisionPortal example

```json
{
  "vision": {
    "defaultProviderId": "vision:visionportal",
    "enabledProviderIds": ["vision:visionportal"]
  }
}
```

Webcam names come from **robot configuration XML**, not from this file.

## Fields

| Field                                | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `vision.defaultProviderId`           | Preferred provider (`vision:limelight`, `vision:visionportal`, …) |
| `vision.enabledProviderIds`          | Providers enabled for diagnostics                                 |
| `vision.pipelineDirectory`           | Repo-relative pipeline-as-code root                               |
| `vision.limelight.host`              | Limelight hostname or IP                                          |
| `vision.limelight.pipelineDirectory` | Limelight JSON directory (overrides global)                       |
| `vision.dashboard.url`               | Full Dashboard URL or hostname                                    |

## Host resolution order (Limelight)

1. CLI `--host`
2. `vision.limelight.host` in `.ftc-dev.json`
3. Discovered endpoint from `ftc vision devices`

If multiple hosts match, the tool returns **selection required** — set `host` explicitly.

## Verify configuration

```bash
ftc vision status --json
ftc vision discover --json
ftc vision devices --json
ftc vision diagnostics --json
```

## Supported versions (honest ranges)

| Component              | Support statement                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FTC SDK**            | Same as parent project (doctor warns on Maven drift). Vision Lab scans Gradle and TeamCode; it does not pin SDK versions.                          |
| **Limelight firmware** | HTTP API on port **5807** (`/status`, `/results`). Tested against mock fixtures matching Limelight 3A JSON shape — **not hardware-certified** yet. |
| **FTC Dashboard**      | Gradle dependency `com.acmerobotics.dashboard:dashboard:*` detected in `build.dependencies.gradle`. Default URL `http://<robot-host>:8080/dash`.   |

Update these rows when [hardware checklists](./vision-hardware-testing.md) pass.

## Sample files

Copy patterns from [samples/vision-workspace](./samples/vision-workspace/README.md) into your real TeamCode repo.
