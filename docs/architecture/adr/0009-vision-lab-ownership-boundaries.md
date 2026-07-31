# ADR-0009: Vision Lab ownership boundaries

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §12 assigns Vision Lab ownership of camera providers, overlays, calibration, frame providers, and structured vision results — with vendor integrations remaining adapters.

Phase 3 shipped substantial Vision Lab foundation: provider registries, Limelight/VisionPortal/EasyOpenCV adapters, diagnostic bridge, IDE panel, result inspector, codegen, and session replay hooks (VISION-01–18). Boundaries between Vision Lab capability code, Core provider registries, and integration adapters are implicit in [vision-providers.md](../vision-providers.md) but not captured as an ADR.

Without explicit ownership rules, adapter logic drifts into Vision Lab (tight coupling) or Vision features scatter into Core (bloated platform).

## Decision

1. **Vision Lab owns (capability module)**

   | Area                    | Responsibility                                                                       | In-repo today                            |
   | ----------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
   | Vision provider catalog | Register and describe vision-specific providers (`vision:*`)                         | `packages/shared/src/vision/`            |
   | Frame consumption       | Resolve frames via Core frame registry by id; no direct camera drivers in Vision Lab | ADR-0004                                 |
   | Structured results      | Normalize vendor results (Limelight, bridge JSON) into shared result shapes          | `vision/limelight/results.ts`, inspector |
   | Overlays                | Render normalized detection overlays in Vision Lab panel (not live video yet)        | Result inspector                         |
   | Calibration UX          | Future: calibration workflows, field maps, upload gates                              | Deferred                                 |
   | Vision diagnostics      | Aggregated `VISION_*` codes, workspace/network checks                                | `vision/diagnostics/`                    |
   | Vision codegen          | Java TeamCode stubs/snippets for vision libraries                                    | `vision/codegen/`                        |
   | Vision Lab surfaces     | VS Code panel, CLI `ftc vision *`, MCP vision tools                                  | extension, cli, mcp                      |

2. **Core owns (platform)**

   | Area                          | Responsibility                                      |
   | ----------------------------- | --------------------------------------------------- |
   | Frame provider registry       | Registration, listing, id stability                 |
   | Telemetry provider registry   | Shared telemetry stream descriptors                 |
   | Session/recording foundations | Header/event schemas, validation, limits (ADR-0012) |
   | Project/workspace discovery   | Gradle/TeamCode analysis used by vision discover    |
   | Network/process execution     | HTTP probes, scaffold file writes, safety gates     |

3. **Integration adapters own (per library)**

   | Area                          | Responsibility                                                          | Examples                                    |
   | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
   | Vendor protocol / file format | Limelight HTTP, VisionPortal static analysis, EasyOpenCV Gradle signals | `vision/limelight/`, `vision/visionportal/` |
   | Robot-side bridge templates   | Generated Java diagnostic bridge                                        | `vision/bridge/`                            |
   | Adapter metadata              | Registry manifest, capability flags                                     | `registry/catalog.ts`                       |
   | Upstream documentation links  | Official vendor docs                                                    | integration manifest                        |

   Adapters MUST NOT import Vision Lab panel or workflow module code. Vision Lab MUST NOT embed vendor-specific protocol details beyond thin adapter delegation.

4. **FTC Replay and Sim boundaries**

   - Vision Lab **produces** vision-domain session events; FTC Replay **owns** capture pipeline and playback semantics ([ADR-0008](./0008-replay-observations-vs-hypotheses.md)).
   - Vision Lab **consumes** frames from any registered frame provider including `frame:sim-virtual:*`; it does not register simulation runtimes ([ADR-0007](./0007-simulation-architecture.md)).

5. **Safety and mutation gates**

   - Read-only discovery and status are default. Mutations (pipeline upload, camera open, deploy scaffold) require explicit flags, `--yes`, or MCP mutation gates per [vision-mcp.md](../vision-mcp.md).
   - Vision Lab never replaces the Driver Station or competition legal checks.

6. **Documentation ownership** — Student/mentor guides under `docs/vision-lab.md` and provider guides are Vision Lab deliverables. Architecture ADRs reference but do not duplicate procedural docs.

## Consequences

- Positive: Clear review boundary for VISION-* epics vs adapter framework vs Core.
- Positive: New vision vendors add adapters without expanding Vision Lab core logic.
- Negative: Some shared normalization code may feel split between adapter and Vision Lab — prefer adapter emits vendor shape, Vision Lab normalizes for UI/replay.
- Follow-up: When extracting `@ftc-dev-tools/vision` package ([ADR-0006](./0006-repository-layout-evolution.md)), move rows in §1 table only.
- Follow-up: Document calibration ownership when VISION calibration epic is scoped.

## Links

- Orchestrator v2 §12 — Vision
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0004](./0004-provider-based-composition.md) — Provider-based composition
- [ADR-0006](./0006-repository-layout-evolution.md) — Repository layout evolution
- [ADR-0007](./0007-simulation-architecture.md) — Simulation architecture
- [ADR-0008](./0008-replay-observations-vs-hypotheses.md) — Replay observations vs hypotheses
- [vision-lab-panel.md](../vision-lab-panel.md)
- [#48 Vision Lab epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)
