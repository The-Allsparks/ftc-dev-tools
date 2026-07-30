# ADR gap analysis — Orchestrator v2 (§1–§19)

Compared existing ADRs 0001–0006 against [Orchestrator v2](../coordination-ledger.md) sections 1–19 and Phase 3 implementation state (July 2026).

**Gate A approved 2026-07-30** — ADRs 0007–0013 accepted; see [index.md](./index.md).

## Summary

| Existing ADR | Orchestrator sections | Adequacy | Notes |
| ------------ | --------------------- | -------- | ----- |
| [0001](./0001-product-taxonomy.md) | §1, §2 | **Adequate** | Four-layer taxonomy matches §1–§2. Telemetry/recording listed under Core but not specified — see [0012](./0012-telemetry-recording-foundations.md). |
| [0002](./0002-java-typescript-boundary.md) | §4 | **Adequate** | Language split and cross-runtime schemas match §4. |
| [0003](./0003-integration-registry.md) | §5 | **Partial** | Registry metadata contract matches §5. Behavioral adapter contract (§13) deferred to [0010](./0010-adapter-requirements-contract.md). Implementation shipped in Phase 2 (`integration-manifest.schema.json`, catalog). |
| [0004](./0004-provider-based-composition.md) | §10 (partial), §11 (partial) | **Partial** | Provider pattern and no cross-capability imports match §10 high level. Simulation specifics → [0007](./0007-simulation-architecture.md). Replay semantics → [0008](./0008-replay-observations-vs-hypotheses.md). |
| [0005](./0005-versioned-shared-schemas.md) | §9 | **Adequate** | Schema versioning policy matches §9. Session and module schemas shipped (v1.0.0). Observation/hypothesis fields not yet in event schema — tracked in ADR-0008. |
| [0006](./0006-repository-layout-evolution.md) | §8 | **Adequate** | Incremental layout evolution matches §8. |

## Sections without dedicated ADRs (acceptable)

| Section | Coverage today | ADR needed? |
| ------- | -------------- | ----------- |
| §3 Ecosystem strategy | [ftc-software-ecosystem.md](../ftc-software-ecosystem.md), ADR-0003/0006 | No — operational doc + registry classification |
| §6 Capability matrix | [library-capability-matrix.md](../library-capability-matrix.md) | No — generated artifact |
| §7 Architecture principles | [project-principles.md](../../project-principles.md), scattered ADRs | No — principles doc |
| §14 Library evaluation | Ecosystem doc + adapter ADR-0010 evaluation hooks | No separate ADR |
| §15 GitHub planning | [backlog-audit.md](../backlog-audit.md) | No — planning doc |
| §16–§18 Sub-agents, phases, CI | [coordination-ledger.md](../coordination-ledger.md), GOVERNANCE | No — process |
| §19 Completion criteria | [repository-inventory.md](../repository-inventory.md) gap matrix | No — tracking |

## New ADRs (Accepted — Gate A 2026-07-30)

| ADR | Title | Orchestrator section | Rationale |
| --- | ----- | -------------------- | --------- |
| [0007](./0007-simulation-architecture.md) | Simulation architecture | §10 | Virtual hardware, runtime registration, frame registry integration — beyond ADR-0004 summary |
| [0008](./0008-replay-observations-vs-hypotheses.md) | Replay observations vs hypotheses | §11 | Semantic model for recorded data; not covered by session envelope alone |
| [0009](./0009-vision-lab-ownership-boundaries.md) | Vision Lab ownership boundaries | §12 | What Vision Lab owns vs what stays in adapters |
| [0010](./0010-adapter-requirements-contract.md) | Adapter requirements contract | §13 | detect/install/validate/patch/codegen/replay-sim hooks beyond registry metadata |
| [0011](./0011-workflow-module-composition.md) | Workflow module composition | §2, §15 | How workflow modules compose capabilities without replacing Core |
| [0012](./0012-telemetry-recording-foundations.md) | Telemetry and recording session foundations | §2, §9, §11 | Core-owned session/telemetry infrastructure vs capability consumers |
| [0013](./0013-public-api-versioning.md) | Public API versioning | §7, §19 | CLI/MCP/extension API versioning independent of npm and schemas |

## Recommended follow-ups

1. Extend `session-event.schema.json` with `recordClass: observation | hypothesis` per ADR-0008 ([#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)).
2. Define `SimulationRuntimeProvider` TypeScript interface per ADR-0007 ([#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234)).
3. Complete `IntegrationAdapter` interface and Pedro migration per ADR-0010 ([#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235)).
4. Add cross-links from ADR-0004 to 0007 and 0008 (optional; gap analysis serves as index).
