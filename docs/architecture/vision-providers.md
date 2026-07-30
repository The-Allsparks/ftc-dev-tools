# Vision provider architecture

Phase 3 foundation for **VISION-01**. Implements [ADR-0004](./adr/0004-provider-based-composition.md): Vision Lab consumes cameras through the frame provider registry, not direct Sim or Replay imports.

## Layers

```mermaid
graph TD
  subgraph adapters [Integration adapters]
    VP[VisionPortal]
    LL[Limelight]
    EOCV[EasyOpenCV]
  end
  subgraph core [Core provider registries]
    FrameReg[Frame providers]
    TeleReg[Telemetry providers]
  end
  subgraph capability [Capability modules]
    VisionLab[Vision Lab]
    Replay[FTC Replay]
    Sim[FTC Sim]
  end
  VP --> FrameReg
  LL --> FrameReg
  Sim --> FrameReg
  Replay --> FrameReg
  FrameReg --> VisionLab
  TeleReg --> VisionLab
  TeleReg --> Replay
```

## Provider types

| Registry   | Purpose                               | Example ids                                                  |
| ---------- | ------------------------------------- | ------------------------------------------------------------ |
| Frame      | Raw camera / image streams            | `frame:visionportal`, `frame:limelight`, `frame:sim-virtual` |
| Vision     | Vision-specific metadata + frame link | `vision:visionportal`, `vision:limelight`                    |
| Telemetry  | Metrics and structured robot data     | `telemetry:logcat`, `telemetry:ftc-dashboard`                |
| Simulation | Pluggable sim runtimes                | `sim:adapter-placeholder`                                    |
| Replay     | Session backends                      | `replay:session-file`                                        |

Vision providers reference a **frame provider id** instead of importing Sim or Replay modules.

## Code locations

| Path                                          | Role                           |
| --------------------------------------------- | ------------------------------ |
| `packages/shared/src/providers/types.ts`      | Provider descriptor interfaces |
| `packages/shared/src/providers/*-registry.ts` | Register / list / get by id    |
| `packages/shared/src/providers/bootstrap.ts`  | Built-in catalog seeds         |
| `packages/shared/schemas/session.schema.json` | Replay session header (v1.0.0) |

## Surfaces

```bash
ftc modules list --json      # capability module manifests
ftc providers list --json    # provider registry snapshot
```

MCP: `modules_list`, `providers_list` (read-only).

## Next steps (VISION-02+)

- Vision configuration and workspace discovery
- Live frame acquisition for VisionPortal / Limelight
- Vision Lab IDE panel consuming `listVisionProviders()`

## Related

- [Vision Lab epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)
- [FTC Replay epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)
- [Library capability matrix](./library-capability-matrix.md)
