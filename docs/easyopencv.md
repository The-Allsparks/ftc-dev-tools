# EasyOpenCV

Scan Gradle and TeamCode for **EasyOpenCV** pipelines, webcam setup, and desktop replay compatibility hints. Static analysis only — does not run OpenCV on the desktop.

Architecture: [architecture/easyopencv-integration.md](./architecture/easyopencv-integration.md)

## Scan workspace

```bash
ftc vision easyopencv status --json
ftc vision discover --json
```

## Scaffold Java

```bash
ftc vision codegen easyopencv --class EasyVisionTele --pipeline-class EasyPipeline --camera "Webcam 1" --yes
```

Optional FTC Dashboard stream:

```bash
ftc vision codegen easyopencv --class EasyVisionTele --dashboard --yes
```

## MCP

`vision_easyopencv_status`

## Supported versions

EasyOpenCV is a community library on top of the FTC SDK. Vision Lab scans for common Gradle patterns and Java package references — it does not pin EasyOpenCV releases. Run `ftc build` on the robot project to confirm dependency resolution.

## Troubleshooting

| Symptom                                | Steps                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Not detected                           | Verify EasyOpenCV dependency in Gradle; check package imports in TeamCode |
| Webcam name mismatch                   | Match `--camera` to robot config XML name                                 |
| Selection required                     | Multiple webcams — specify `--camera` in codegen                          |
| Desktop replay hints warn incompatible | Expected for phone-only pipelines — test on robot                         |
| Build fails after codegen              | Fix first Gradle error; codegen emits Java stubs only                     |

## Related

- [FTC Dashboard](./ftc-dashboard.md)
- [VisionPortal](./visionportal.md) — alternative vision stack
