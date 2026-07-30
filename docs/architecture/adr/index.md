# ADR index

Architecture Decision Records (ADRs) capture significant technical decisions for FTC Dev Tools.

## Gap analysis (Orchestrator v2 §1–§19)

Full comparison: **[gap-analysis.md](./gap-analysis.md)**

| Existing ADR | Adequacy | Action |
| ------------ | -------- | ------ |
| 0001 Product taxonomy | Adequate | — |
| 0002 Java–TypeScript boundary | Adequate | — |
| 0003 Integration registry | Partial (metadata only) | Supplemented by **0010** |
| 0004 Provider-based composition | Partial | Supplemented by **0007**, **0008** |
| 0005 Versioned shared schemas | Adequate | **0008** extends event semantics |
| 0006 Repository layout evolution | Adequate | — |

**ADRs 0007–0013** accepted at **Gate A (2026-07-30)**: simulation architecture, replay observations vs hypotheses, Vision Lab ownership, adapter requirements contract, workflow module composition, telemetry/recording foundations, public API versioning.

---

| ADR                                           | Title                                  | Status   |
| --------------------------------------------- | -------------------------------------- | -------- |
| [0000](./0000-adr-template.md)                | ADR template                           | Accepted |
| [0001](./0001-product-taxonomy.md)            | Product taxonomy                       | Accepted |
| [0002](./0002-java-typescript-boundary.md)    | Java–TypeScript boundary               | Accepted |
| [0003](./0003-integration-registry.md)        | Integration registry                   | Accepted |
| [0004](./0004-provider-based-composition.md)  | Provider-based composition             | Accepted |
| [0005](./0005-versioned-shared-schemas.md)    | Versioned shared schemas               | Accepted |
| [0006](./0006-repository-layout-evolution.md) | Repository layout evolution            | Accepted |
| [0007](./0007-simulation-architecture.md)     | Simulation architecture                | Accepted |
| [0008](./0008-replay-observations-vs-hypotheses.md) | Replay observations vs hypotheses | Accepted |
| [0009](./0009-vision-lab-ownership-boundaries.md)   | Vision Lab ownership boundaries   | Accepted |
| [0010](./0010-adapter-requirements-contract.md)     | Adapter requirements contract     | Accepted |
| [0011](./0011-workflow-module-composition.md)       | Workflow module composition       | Accepted |
| [0012](./0012-telemetry-recording-foundations.md)   | Telemetry and recording session foundations | Accepted |
| [0013](./0013-public-api-versioning.md)             | Public API versioning             | Accepted |

Process: see [GOVERNANCE.md](../../../GOVERNANCE.md) and [coordination-ledger.md](../coordination-ledger.md).
