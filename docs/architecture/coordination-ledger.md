# Orchestrator Phase 1–3 — Coordination Ledger

This ledger tracks workstreams for the modular architecture transition.

## Phase status

| Phase                                            | Status       | Notes                        |
| ------------------------------------------------ | ------------ | ---------------------------- |
| Phase 1 — Inventory, backlog audit, ADRs         | **Complete** | PR #155                      |
| Phase 2 — Registry, schemas, ecosystem docs      | **Complete** | PR #156                      |
| Phase 3 — Vision, Replay, Sim, Hardware, Tuning  | **Active**   | Branch `orchestrator/phase3` |
| Phase 4 — Adapter framework and library adapters | Blocked      | Pending Phase 3 foundations  |
| Phase 5 — Workflow modules                       | Blocked      | Pending Phase 4              |
| Phase 6 — Documentation, CI, packaging           | Blocked      | Pending Phase 5              |

## Phase 3 deliverables (in progress)

| Deliverable                                                 | Status                     |
| ----------------------------------------------------------- | -------------------------- |
| Module registry (capability + workflow manifests)           | Complete                   |
| Provider registries (frame, vision, telemetry, sim, replay) | Complete                   |
| Session recording schema v1.0.0                             | Complete                   |
| Vision provider architecture doc (VISION-01)                | Complete                   |
| `ftc modules list` + `ftc providers list`                   | Complete                   |
| MCP `modules_list` + `providers_list`                       | Complete                   |
| VISION-02 vision config + workspace discovery               | Complete                   |
| `ftc vision status` / `discover` + MCP vision tools         | Complete                   |
| VISION-03 vision endpoint + service discovery               | Complete                   |
| `ftc vision devices` + MCP `vision_devices`                 | Complete                   |
| VISION-04 Limelight Vision HTTP provider (status/results)   | Complete                   |
| `ftc vision limelight` + MCP limelight tools                | Complete                   |
| Vision Lab live frames / IDE panel                          | Deferred — VISION-05+      |
| Limelight mutations (pipeline switch, snapshots)            | Deferred — VISION-04+      |
| Replay capture pipeline                                     | Deferred — FTC Replay epic |
| Sim runtime adapters                                        | Deferred — FTC Sim epic    |

## Meta tracking

- Phase 1: [#141](https://github.com/The-Allsparks/ftc-dev-tools/issues/141) (complete)
- Phase 2: [#142](https://github.com/The-Allsparks/ftc-dev-tools/issues/142), [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147)
- Phase 3: [#48 Vision Lab](https://github.com/The-Allsparks/ftc-dev-tools/issues/48), [#143 Replay](https://github.com/The-Allsparks/ftc-dev-tools/issues/143), [#145 Sim](https://github.com/The-Allsparks/ftc-dev-tools/issues/145)

## Review gates (before Phase 4)

1. Vision provider interfaces stable for adapter implementations (Limelight Vision, VisionPortal)
2. Session schema reviewed for replay event format follow-up
3. Module registry covers all capability epics
4. No breaking changes to 0.1.0 CLI commands

## Assumptions log

| Date       | Assumption                                                                 | Rationale           |
| ---------- | -------------------------------------------------------------------------- | ------------------- |
| 2026-07-30 | Provider catalog is descriptor-only; no live streaming yet                 | Incremental Phase 3 |
| 2026-07-30 | Vision references frame providers; Sim registers virtual frames separately | ADR-0004            |
| 2026-07-30 | Session schema covers header only; events schema is next Replay task       | ADR-0005            |

## Related documents

- [Vision providers](./vision-providers.md)
- [FTC software ecosystem](./ftc-software-ecosystem.md)
- [Library capability matrix](./library-capability-matrix.md)
- [Architecture decision records](./adr/)
