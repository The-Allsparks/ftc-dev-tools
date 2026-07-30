# EasyOpenCV integration (VISION-09)

Desktop-side EasyOpenCV support for Vision Lab: Gradle dependency detection, TeamCode static analysis, FTC Dashboard stream hints, pipeline source navigation, and desktop replay compatibility heuristics.

## CLI

```bash
ftc vision easyopencv status --json
```

Reports:

- EasyOpenCV Gradle dependency version (when present)
- `OpenCvWebcamFactory` initialization and configured camera name
- Pipeline classes extending `OpenCvPipeline`
- FTC Dashboard `startCameraStream` usage
- `@Config` fields for Dashboard pipeline tuning
- Desktop replay compatibility (`likely`, `unlikely`, `unknown`) with Android dependency blockers
- Source navigation entries for detected pipeline and webcam-init files

## MCP

| Tool                       | CLI equivalent                        |
| -------------------------- | ------------------------------------- |
| `vision_easyopencv_status` | `ftc vision easyopencv status --json` |

## Templates

Shared render helpers (used by future codegen / VISION-12):

- `renderEasyOpenCvPipelineSource()` — OpenCV-only pipeline stub
- `renderEasyOpenCvWebcamInitSnippet()` — webcam factory + optional Dashboard stream

## Capabilities (foundation)

| Capability                          | Status                |
| ----------------------------------- | --------------------- |
| Static Gradle + TeamCode scan       | yes                   |
| Source navigation paths             | yes                   |
| FTC Dashboard streaming hints       | yes                   |
| Pipeline / webcam templates         | yes                   |
| Diagnostic result adapter           | yes                   |
| Desktop replay compatibility report | yes                   |
| Live frame capture                  | deferred — VISION-10+ |
| Full desktop replay runner          | deferred              |

## Safety

- Multiple cameras or ambiguous webcam/pipeline targets set `requiresSelection`.
- Desktop replay never claims compatibility without heuristic review; Android-only pipelines are flagged `unlikely`.

## Related

- [Vision providers](./vision-providers.md)
- [VISION-09 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/57)
