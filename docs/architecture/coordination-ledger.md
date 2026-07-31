# Orchestrator v2 — Coordination Ledger

**Single source of truth:** FTC Dev Tools Cursor Orchestrator v2 (supersedes all prior orchestration prompts).

This ledger tracks workstreams, review gates, and phase status for the modular architecture transition.

## Immediate execution status (2026-07-30)

| Workstream           | Status       | Deliverable                                                 |
| -------------------- | ------------ | ----------------------------------------------------------- |
| Repository Inventory | **Complete** | [repository-inventory.md](./repository-inventory.md)        |
| Backlog Audit        | **Complete** | [backlog-audit.md](./backlog-audit.md)                      |
| ADR Generation       | **Complete** | [adr/index.md](./adr/index.md), ADRs 0007–0013 **Accepted** |

**Gate A:** Approved 2026-07-30 — maintainer sign-off received.

---

## Phase status

| Phase                                            | Status       | Notes                                                                                                 |
| ------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------- |
| Phase 1 — Inventory, backlog audit, ADRs         | **Complete** | v2 refresh + Gate A approved                                                                          |
| Phase 2 — Registry, schemas, ecosystem docs      | **Complete** | PR #156; registries and docs on `main`                                                                |
| Phase 3 — Vision, Replay, Sim, Hardware, Tuning  | **Active**   | Vision foundations shipped; Replay schema only; Sim/Tuning partial                                    |
| Phase 4 — Adapter framework and library adapters | **Active**   | ADR-0010 Accepted; ADAPT-01 shipped ([#239](https://github.com/The-Allsparks/ftc-dev-tools/pull/239)) |
| Phase 5 — Workflow modules                       | **Blocked**  | Pending Phase 4                                                                                       |
| Phase 6 — Documentation, CI, packaging           | **Blocked**  | Pending Phase 5                                                                                       |

---

## Phase 3 deliverables

| Deliverable                                                         | Status                    |
| ------------------------------------------------------------------- | ------------------------- |
| Module registry (8 manifests)                                       | Complete                  |
| Integration registry (11 entries)                                   | Complete                  |
| Provider registries (frame, vision, telemetry, sim, replay)         | Complete                  |
| Session recording schema v1.0.0                                     | Complete                  |
| Vision Lab foundation (VISION-01–18)                                | Complete                  |
| `ftc modules list` / `ftc providers list` / `ftc integrations list` | Complete                  |
| MCP registry + vision tools (59 tools)                              | Complete                  |
| Vision Lab IDE panel (read-only foundation)                         | Complete                  |
| Replay schema + validation CLI/MCP                                  | Complete                  |
| Live replay capture pipeline                                        | **Active** — REPLAY-01    |
| Sim runtime adapters                                                | **Active** — SIM-01       |
| Physical hardware validation (VISION-17)                            | Pending                   |
| Tuning Lab architecture (TUNE-01+)                                  | Backlog filed (#208–#232) |

---

## Phase 4 deliverables (active)

| Deliverable                                 | Status      | Issue / PR                                                                                                                                            |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| IntegrationAdapter interface + registration | **Shipped** | [#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235) closed via [#239](https://github.com/The-Allsparks/ftc-dev-tools/pull/239) |
| Pedro reference adapter                     | **Shipped** | `packages/shared/src/registry/adapters/pedro-integration-adapter.ts`                                                                                  |
| `ftc integrations list --with-adapters`     | **Shipped** | adapter operation readiness in CLI                                                                                                                    |
| Pedro migration to adapter contract         | Pending     | #149                                                                                                                                                  |
| Registry-driven integration docs            | Pending     | ADAPT-03 (not filed)                                                                                                                                  |

---

## Review gates

### Gate A — Phase 1 v2 sign-off ✅ Approved 2026-07-30

- [x] Repository inventory reviewed
- [x] Backlog audit reviewed
- [x] ADRs 0007–0013 Accepted
- [x] Close stale VISION-01–05 (#49–#53)
- [x] Dedupe #185 / #186
- [x] MCP smoke bugs (#188–#204) — triaged 2026-07-30; closed as environment prerequisites, not product defects

### Gate B — Phase 4 → Phase 5 entry

1. Vision provider interfaces stable for adapter implementations
2. Session schema `recordClass` field per ADR-0008
3. IntegrationAdapter interface shipped (ADAPT-01)
4. No breaking changes to shipped 0.1.x CLI commands

---

## Backlog actions (Gate A execution)

| Action                                | Status |
| ------------------------------------- | ------ |
| Close VISION-01–05 (#49–#53)          | Done   |
| Close duplicate #186 (keep #185)      | Done   |
| Sync Tuning Lab epic title in catalog | Done   |
| Add Robot Inspector epic to catalog   | Done   |
| File ADAPT-01, REPLAY-01, SIM-01      | Done   |
| MCP smoke triage (#188–#204)          | Done   |

---

## Meta tracking

| Phase                  | GitHub                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 meta           | [#141](https://github.com/The-Allsparks/ftc-dev-tools/issues/141)                                                                             |
| Phase 2 Core           | [#142](https://github.com/The-Allsparks/ftc-dev-tools/issues/142), [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147)          |
| Phase 3 Vision         | [#48](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)                                                                               |
| Phase 3 Replay         | [#143](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)                                                                             |
| Phase 3 Sim            | [#145](https://github.com/The-Allsparks/ftc-dev-tools/issues/145)                                                                             |
| Phase 3 Hardware       | [#144](https://github.com/The-Allsparks/ftc-dev-tools/issues/144)                                                                             |
| Phase 3 Tuning         | [#146](https://github.com/The-Allsparks/ftc-dev-tools/issues/146)                                                                             |
| Robot Inspector        | [#205](https://github.com/The-Allsparks/ftc-dev-tools/issues/205)                                                                             |
| Phase 4 Adapter        | [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147), [#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235) |
| Phase 3 Replay capture | [#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)                                                                   |
| Phase 3 Sim runtime    | [#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234)                                                                      |

---

## Assumptions log

| Date       | Assumption                                                                 | Rationale           |
| ---------- | -------------------------------------------------------------------------- | ------------------- |
| 2026-07-30 | Provider catalog is descriptor-only; no live streaming yet                 | Incremental Phase 3 |
| 2026-07-30 | Vision references frame providers; Sim registers virtual frames separately | ADR-0004            |
| 2026-07-30 | Session schema covers header; events need `recordClass` per ADR-0008       | ADR-0005, ADR-0008  |
| 2026-07-30 | **Gate A approved** — ADRs 0007–0013 Accepted; Phase 4 unblocked           | Maintainer sign-off |

---

## Related documents

| Document                                                    | Purpose                              |
| ----------------------------------------------------------- | ------------------------------------ |
| [Repository inventory](./repository-inventory.md)           | Current repo map to product taxonomy |
| [Backlog audit](./backlog-audit.md)                         | GitHub epic alignment                |
| [ADR index](./adr/index.md)                                 | Architecture decisions               |
| [ADR gap analysis](./adr/gap-analysis.md)                   | §1–§19 coverage vs existing ADRs     |
| [FTC software ecosystem](./ftc-software-ecosystem.md)       | Library classification               |
| [Library capability matrix](./library-capability-matrix.md) | Capability cross-reference           |
| [Vision providers](./vision-providers.md)                   | Vision Lab provider architecture     |
