# Limelight Vision

Configure and read **Limelight 3A** (or compatible) coprocessors over HTTP port **5807**. Pipeline upload and activate are **deferred** — read-only status, results, and workspace pipeline validation ship today.

## Configure

1. Set team number or host in `.ftc-dev.json`:

```json
{
  "teamNumber": 916,
  "vision": {
    "limelight": {
      "host": "10.9.16.11",
      "pipelineDirectory": "limelight/pipelines"
    }
  }
}
```

2. Confirm network path (USB ADB + robot radio, or field Wi‑Fi). See [Wi‑Fi helpers](./wifi.md).

## Daily commands

```bash
ftc vision limelight status
ftc vision limelight results --json
ftc vision open --provider vision:limelight
ftc vision limelight pipelines list --json
ftc vision limelight pipelines validate --json
ftc vision limelight pipelines diff --slot 0 --host 10.9.16.11 --json
```

Explicit host when multiple candidates exist:

```bash
ftc vision limelight status --host 10.9.16.11
```

## Java codegen

```bash
ftc vision codegen limelight --class LimelightTele --yes
```

## MCP tools

`vision_limelight_status`, `vision_limelight_results`, `vision_limelight_pipelines_*`, agent aliases `vision_list_pipelines`, `vision_validate_pipeline`, `vision_compare_pipeline`.

## Supported firmware (honest)

CI uses JSON fixtures matching common Limelight 3A `/status` and `/results` fields. **Physical Limelight validation is pending** — see [Vision hardware testing](./vision-hardware-testing.md).

## Troubleshooting

| Symptom                  | Steps                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Unreachable / timeout    | Ping robot network; run `ftc wifi route ensure --yes`; set `--host` explicitly                                              |
| Selection required       | Multiple Wi‑Fi ADB devices or hosts — pass `--host` or disconnect extras                                                    |
| Empty / invalid results  | Check pipeline on Limelight web UI; run `ftc vision diagnostics`                                                            |
| Stale results flag       | Target may be old — verify lighting and pipeline lock                                                                       |
| Malformed JSON           | Tool normalizes safely; if persistent, power-cycle Limelight and re-test                                                    |
| Pipeline validate errors | Fix JSON in `pipelineDirectory`; see sample [pipeline0.json](./samples/vision-workspace/limelight/pipelines/pipeline0.json) |

## Related

- [Vision configuration](./vision-configuration.md)
- [Architecture: vision providers](./architecture/vision-providers.md)
