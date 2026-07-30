# Vision code generators (VISION-12)

Java TeamCode generators, editor snippets, and expanded Vision Lab source navigation. **Robot-side codegen targets Java only** — Kotlin OpModes are not generated or scanned by vision tooling; Limelight `.py` pipeline scripts remain workspace artifacts (not robot code).

## Language scope

| Target                   | Supported                               |
| ------------------------ | --------------------------------------- |
| Java TeamCode (`.java`)  | Yes — all generators and snippets       |
| Kotlin TeamCode (`.kt`)  | No — use Java generators or hand-port   |
| Limelight Python scripts | Inventory/navigation only (not codegen) |

This matches [ADR-0002 Java/TypeScript boundary](./adr/0002-java-typescript-boundary.md): desktop tools are TypeScript; robot stubs are Java.

## Shared API

`packages/shared/src/vision/codegen/`:

| Export                          | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `scaffoldVisionCodegen()`       | Preview or write generated Java files                        |
| `resolveVisionCodegenContext()` | Package, webcam names from robot config, Dashboard detection |
| `VISION_CODEGEN_KINDS`          | Supported template kinds                                     |
| `VISION_CODEGEN_LANGUAGE`       | Always `"java"`                                              |

### Codegen kinds

| Kind                    | Output                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| `easyopencv`            | Pipeline class + LinearOpMode with webcam init, optional Dashboard stream |
| `visionportal-apriltag` | LinearOpMode with AprilTagProcessor + safe `VisionPortal.close()`         |
| `visionportal-color`    | LinearOpMode with ColorProcessor + cleanup                                |
| `limelight`             | TeleOp with NetworkTables init, result loop, D-pad pipeline switching     |
| `dashboard-stream`      | TeleOp with FTC Dashboard `startCameraStream` + cleanup                   |

Webcam names are read from `TeamCode/src/main/res/xml/*.xml` when available. Multiple webcams without `--camera` / explicit selection fails closed (no silent pick).

Generated files include `VISION-12` markers, required imports, and safe camera cleanup in `finally` blocks where applicable. Existing files are not overwritten unless `--force`.

## CLI

```bash
ftc vision codegen list
ftc vision codegen scaffold easyopencv --class EasyOpenCvTeleOp --dry-run
ftc vision codegen scaffold visionportal-apriltag --class AprilTagTeleOp --camera "Webcam 1" --yes
ftc vision codegen scaffold limelight --class LimelightTeleOp --yes
```

## MCP

`vision_codegen` — gated mutation with `confirm` + dry-run preview (38 MCP tools).

## VS Code

- Command Palette: **FTC: Generate Vision Java Code** (`ftc.visionCodegen`)
- Snippets in `ftc-java.code-snippets`: `ftc-easyopencv-*`, `ftc-limelight-*`, `ftc-vision-color`, `ftc-dashboard-stream`, `ftc-vision-cleanup`
- Vision Lab **Source navigation** includes bridge utility/OpMode and Limelight pipeline/script paths

Diagnostic bridge scaffold remains `ftc vision bridge scaffold` / `vision_bridge_scaffold`.

## Deferred

- SDK compilation fixtures against multiple FTC SDK versions
- Official SDK sample integration (#12)
- Kotlin snippet/codegen parity

## Related

- [Vision Lab panel](./vision-lab-panel.md)
- [VISION-12 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/60)
