# FTC Dashboard

Detect the [FTC Dashboard](https://acmerobotics.github.io/ftc-dashboard/) Gradle dependency, resolve the robot URL, and open the browser dashboard. Vision Lab does **not** embed a proprietary dashboard — it interoperates with Acme Robotics' community tool.

## Configure

Optional URL in `.ftc-dev.json`:

```json
{
  "vision": {
    "dashboard": {
      "url": "http://192.168.43.1:8080/dash"
    }
  }
}
```

Or pass CLI flags:

```bash
ftc vision dashboard status --host 192.168.43.1
ftc vision dashboard open --host 192.168.43.1
ftc vision open --provider telemetry:ftc-dashboard --host 192.168.43.1
```

## Detect dependency

```bash
ftc vision dashboard status --json
ftc vision discover --json
```

Looks for `com.acmerobotics.dashboard:dashboard` in `build.dependencies.gradle`.

## EasyOpenCV + Dashboard stream

Codegen can include Dashboard camera stream helpers:

```bash
ftc vision codegen easyopencv --class VisionTele --dashboard --yes
```

## MCP

`vision_dashboard_status`, `vision_dashboard_open`, agent tools via `vision_open` patterns.

## Supported Dashboard versions

Gradle coordinate detection accepts common `com.acmerobotics.dashboard:dashboard:<version>` lines. **Specific version compatibility is mock-tested only** — validate on your robot before competition.

## Competition warning

Dashboard uses robot network bandwidth. Confirm with event rules and alliance strategy before opening streams during matches. See [Vision Lab → Competition use](./vision-lab.md#competition-use-warning).

## Troubleshooting

| Symptom                 | Steps                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| Dependency not detected | Add Dashboard to `build.dependencies.gradle`; sync Gradle               |
| Browser 404             | Verify OpMode running and phone/hub IP; try `ftc vision devices --json` |
| Wrong host              | Set `vision.dashboard.url` or `--host` explicitly                       |
| Selection required      | Multiple dashboard endpoints — pick `--endpoint` from devices JSON      |

## Related

- [Telemetry spike](./telemetry-spike.md) — why FTC Dev Tools does not ship a duplicate dashboard
- [EasyOpenCV](./easyopencv.md)
