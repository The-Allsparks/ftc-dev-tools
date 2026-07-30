# Orchestrator Phase 1–2 — Coordination Ledger

This ledger tracks workstreams for the modular architecture transition. It is the single in-repo coordination surface for branch ownership, review gates, and assumptions.

**External direction:** Orchestrator v2 (maintainer chat, July 2026) defines product taxonomy, integration registry, and long-term phases. That document is not committed to the repo; this ledger references it for traceability.

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Inventory, backlog audit, ADRs | **Complete** | Merged in PR #155 |
| Phase 2 — ADRs accepted, public APIs, schemas, module registry | **Active** | Branch `orchestrator/phase2` |
| Phase 3 — Vision, Replay, Sim, Hardware, Tuning | Blocked | Pending Phase 2 review |
| Phase 4 — Adapter framework and library adapters | Blocked | Pending Phase 3 |
| Phase 5 — Workflow modules | Blocked | Pending Phase 4 |
| Phase 6 — Documentation, issue alignment, CI, packaging | Blocked | Pending Phase 5 |

## Phase 2 deliverables (in progress)

| Deliverable | Status |
|-------------|--------|
| ADRs 0001–0006 accepted | Complete |
| `ftc-software-ecosystem.md` | Complete |
| `library-capability-matrix.md` | Complete |
| Integration manifest + module manifest schemas | Complete |
| Integration registry in `packages/shared` | Complete |
| `ftc integrations list` + MCP `integrations_list` | Complete |
| Pedro adapter migration to framework | Deferred — Phase 4 |

## Workstreams (Phase 1 — complete)

| Workstream | Branch | Status | Deliverables |
|------------|--------|--------|--------------|
| Coordination ledger | `orchestrator/phase1` | Complete | Merged PR #155 |
| Repository inventory | `orchestrator/phase1` | Complete | [repository-inventory.md](./repository-inventory.md) |
| Backlog audit | `orchestrator/phase1` | Complete | [backlog-audit.md](./backlog-audit.md), epics #142–#154 |
| ADR generation | `orchestrator/phase1` | Complete | [adr/](./adr/) |

## Meta tracking

- Phase 1: [#141](https://github.com/The-Allsparks/ftc-dev-tools/issues/141) (complete)
- Phase 2: track on Adapter Framework [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147) and Core Platform [#142](https://github.com/The-Allsparks/ftc-dev-tools/issues/142)

## Review gates (before Phase 3)

1. Integration registry API stable enough for Vision Lab provider work
2. Module manifest schema used by at least one capability module stub
3. Ecosystem doc and capability matrix reviewed by maintainers
4. No breaking changes to existing CLI/MCP commands

## Assumptions log

| Date | Assumption | Rationale |
|------|------------|-----------|
| 2026-07-29 | Orchestrator v2 remains chat-only | Maintainer decision |
| 2026-07-29 | Pedro Pathing epic focuses on adapter-framework migration | Integration already shipped |
| 2026-07-29 | FTC Replay epic is platform-wide; VISION-13 is a child candidate | Avoid duplicate replay work |
| 2026-07-29 | Incremental layout evolution, not big-bang restructure | ADR-0006 |
| 2026-07-30 | Phase 1 approved; Phase 2 registry is metadata-first | Maintainer sign-off |
| 2026-07-30 | Built-in catalog is source of truth until external manifests load | Minimal Phase 2 scope |

## Related documents

- [Repository inventory](./repository-inventory.md)
- [Backlog audit](./backlog-audit.md)
- [FTC software ecosystem](./ftc-software-ecosystem.md)
- [Library capability matrix](./library-capability-matrix.md)
- [Architecture decision records](./adr/)
