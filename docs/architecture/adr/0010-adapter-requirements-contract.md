# ADR-0010: Adapter requirements contract

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §13 requires integration adapters to detect, install, validate, patch projects safely, generate Java code, integrate with Replay and Sim, and preserve upstream ownership.

[ADR-0003](./0003-integration-registry.md) defines **metadata registration** (id, capabilities, SDK versions, replay/sim flags). Phase 2 shipped `integration-manifest.schema.json` and a read-only catalog. Pedro Pathing (`packages/shared/src/pedro/`) implements detect/add/scaffold today without a formal adapter interface.

Phase 4 (adapter framework, [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147)) is blocked until provider and session foundations stabilize. This ADR defines the **behavioral contract** adapters must implement beyond manifest metadata ([#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235)).

## Decision

1. **Adapter vs registry** — The integration registry stores manifests (ADR-0003). Each shipped integration also implements an `IntegrationAdapter` interface in `packages/shared/src/registry/adapter-types.ts` with the operations below.

2. **Required operations**

   | Operation                       | Purpose                                                                | Safety                               |
   | ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
   | `detect(projectRoot)`           | Determine if integration is present, partial, or absent                | Read-only                            |
   | `validate(projectRoot)`         | Check version compatibility, config consistency, doctor-style warnings | Read-only                            |
   | `install(projectRoot, options)` | Add dependency, apply Gradle/settings changes                          | Dry-run default; `--yes` to write    |
   | `patch(projectRoot, plan)`      | Apply idempotent project patches (templates, config snippets)          | Backup or dry-run                    |
   | `codegen(projectRoot, spec)`    | Generate or update Java (or template) files in TeamCode                | Never overwrite without confirmation |
   | `replayHints(projectRoot)`      | Declare replay event sources and `recordClass` defaults (ADR-0008)     | Read-only                            |
   | `simulationHooks(projectRoot)`  | Register or document simulation runtime entry points (ADR-0007)        | Read-only until Sim ships            |

   Not every adapter implements every operation — unsupported operations return a structured `unsupported` result with reason. Manifest `capabilities` must reflect what is actually implemented.

3. **Preserve upstream ownership**

   - Adapters wrap upstream libraries; they do not fork or vendor source except as documented patches.
   - Generated code includes upstream attribution and documentation links from manifest `documentationUrl`.
   - Version pins follow upstream recommendations; adapters document override policy.

4. **Project safety**

   - All write operations support `--dry-run` / preview diff.
   - Non-empty overwrites require explicit confirmation.
   - Patches are idempotent: re-running install/patch on an already-configured project is a no-op or reports up-to-date.
   - Adapters must not modify `FtcRobotController` upstream sources — TeamCode and Gradle settings only unless maintainer-approved exception.

5. **Replay and Sim integration**

   - Adapters with `replaySupport: true` document which events they emit and whether each is observation or hypothesis ([ADR-0008](./0008-replay-observations-vs-hypotheses.md)).
   - Adapters with `simulationSupport: true` expose runtime registration metadata consumable by FTC Sim ([ADR-0007](./0007-simulation-architecture.md)).
   - Vision adapters register frame/vision providers at activation; pathing adapters may register telemetry providers.

6. **Library evaluation gate (Orchestrator §14)** — New adapters require maintainer evaluation record: maintenance status, SDK compatibility, adoption, documentation, licensing, replay/sim compatibility, long-term maintenance. Classification (`supported` / `experimental` / `legacy` / `deprecated`) is stored in manifest and [ftc-software-ecosystem.md](../ftc-software-ecosystem.md).

7. **Migration** — Pedro Pathing is the reference migration: extract current pedro module into the adapter contract, populate manifest, keep CLI/MCP commands as thin wrappers over adapter methods.

8. **Surfaces** — CLI subcommands and MCP tools call adapter operations; they do not duplicate Gradle logic. Registry lists adapters; doctor runs `validate` across detected integrations.

## Consequences

- Positive: Consistent rookie and mentor experience across Pedro, Dashboard, Limelight, etc.
- Positive: Agent tools can introspect adapter capabilities from registry + uniform result envelopes.
- Negative: One-time refactor cost for Pedro and vision modules that already implement ad hoc patterns.
- Negative: Codegen and patch safety require thorough test fixtures per adapter.
- Follow-up: Complete `IntegrationAdapter` interface and Pedro migration ([#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235)).
- Follow-up: Add adapter validation tests to CI matrix.

## Links

- Orchestrator v2 §13 — Adapter requirements; §14 — Library evaluation
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0003](./0003-integration-registry.md) — Integration registry
- [ADR-0007](./0007-simulation-architecture.md) — Simulation architecture
- [ADR-0008](./0008-replay-observations-vs-hypotheses.md) — Replay observations vs hypotheses
- `packages/shared/schemas/integration-manifest.schema.json`
- `packages/shared/src/registry/adapter-types.ts`
- `packages/shared/src/pedro/` — Pre-contract reference implementation
- [#147 Adapter Framework epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/147)
- [#235 ADAPT-01: Define IntegrationAdapter interface and registration API](https://github.com/The-Allsparks/ftc-dev-tools/issues/235)
