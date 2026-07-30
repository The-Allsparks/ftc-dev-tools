# Orchestrator Phase 1 — Coordination Ledger

This ledger tracks Phase 1 workstreams for the modular architecture transition. It is the single in-repo coordination surface for branch ownership, review gates, and assumptions.

**External direction:** Orchestrator v2 (maintainer chat, July 2026) defines product taxonomy, integration registry, and long-term phases. That document is not committed to the repo; this ledger references it for traceability.

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Inventory, backlog audit, ADRs | **Active** | Docs and issue metadata only |
| Phase 2 — ADRs accepted, public APIs, schemas, module registry | Blocked | Pending maintainer review |
| Phase 3 — Vision, Replay, Sim, Hardware, Tuning | Blocked | Pending Phase 2 |
| Phase 4 — Adapter framework and library adapters | Blocked | Pending Phase 3 |
| Phase 5 — Workflow modules | Blocked | Pending Phase 4 |
| Phase 6 — Documentation, issue alignment, CI, packaging | Blocked | Pending Phase 5 |

## Workstreams

| Workstream | Branch | Status | Deliverables |
|------------|--------|--------|--------------|
| Coordination ledger | `orchestrator/phase1` | Complete | This file, GOVERNANCE ADR pointer, VitePress sidebar |
| Repository inventory | `orchestrator/phase1` | Complete | [repository-inventory.md](./repository-inventory.md) |
| Backlog audit | `orchestrator/phase1` | Complete | [backlog-audit.md](./backlog-audit.md), GitHub epics, catalog updates |
| ADR generation | `orchestrator/phase1` | Complete | [adr/](./adr/) (0000–0006) |

> Phase 1 workstreams were consolidated on branch `orchestrator/phase1` for initial delivery. Future phases should use dedicated branches per orchestrator §16.

## Meta tracking issue

GitHub issue **[#141 — Phase 1: Orchestrator coordination](https://github.com/The-Allsparks/ftc-dev-tools/issues/141)** tracks this phase. Link draft PRs and sub-workstream PRs to that issue.

## File ownership (Phase 1)

| Path | Owner workstream |
|------|------------------|
| `docs/architecture/coordination-ledger.md` | Ledger |
| `docs/architecture/repository-inventory.md` | Inventory |
| `docs/architecture/backlog-audit.md` | Backlog |
| `docs/architecture/adr/*` | ADRs |
| `scripts/issue-label-catalog.json` (epic entries) | Backlog |
| `.github/labels.yml` (new labels) | Backlog |
| `GOVERNANCE.md` (ADR paragraph) | Ledger |
| `docs/.vitepress/config.mts` (Architecture sidebar) | Ledger |
| `docs/architecture.md` (supersession note) | ADRs |

**Constraint:** No changes under `packages/` in Phase 1.

## Review gates (before Phase 2)

Maintainers must approve:

1. Product taxonomy (ADR-0001) — Core / Capability / Workflow / Adapter layers
2. Java–TypeScript boundary (ADR-0002) — robot stays Java; schemas are language-neutral
3. Integration registry design (ADR-0003) — metadata schema and registration model
4. Provider-based composition (ADR-0004) — Vision / Sim / Replay decoupling
5. Epic map in [backlog-audit.md](./backlog-audit.md) — no duplicate umbrellas; VISION-* stays under Vision Lab
6. Repository inventory gap matrix — Phase 2 scope is bounded

Phase 2 may begin only after explicit maintainer sign-off on this ledger and linked PR.

## Assumptions log

| Date | Assumption | Rationale |
|------|------------|-----------|
| 2026-07-29 | Orchestrator v2 remains chat-only | Maintainer decision; referenced here, not committed |
| 2026-07-29 | Pedro Pathing epic focuses on adapter-framework migration | Integration already shipped; not greenfield |
| 2026-07-29 | FTC Replay epic is platform-wide; VISION-13 is a child candidate | Avoid duplicate replay work under Vision only |
| 2026-07-29 | Road Runner, NextFTC, FTCLib epics are evaluation-first (P3) | README and architecture defer or omit these |
| 2026-07-29 | Incremental layout evolution, not big-bang restructure | ADR-0006; preserve working 0.1.0 monorepo |
| 2026-07-29 | New GitHub epic issues filed in Phase 1 | Backlog audit includes catalog sync per plan |

## Related documents

- [Repository inventory](./repository-inventory.md)
- [Backlog audit](./backlog-audit.md)
- [Architecture decision records](./adr/)
- [Architecture (0.1.0 reference)](../architecture.md)
- [Issue labels](../issue-labels.md)
