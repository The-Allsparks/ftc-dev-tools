# ADR-0011: Workflow module composition

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §2 defines **Workflow Modules** (Autonomous Studio, Driver Practice, Match Analysis, Season Support) that compose capabilities without replacing Core. §15 lists GitHub epics for workflow modules including Match Analysis ([#153](https://github.com/The-Allsparks/ftc-dev-tools/issues/153)) and Autonomous Studio ([#154](https://github.com/The-Allsparks/ftc-dev-tools/issues/154)).

[ADR-0001](./0001-product-taxonomy.md) names workflow modules and states they compose capabilities through Core, but does not define composition rules, dependency declarations, or boundaries vs capability modules.

Phase 5 is blocked pending Phase 4 adapter framework. Module manifests (`module-manifest.schema.json`) include `layer: workflow` and `dependsOn` but no workflow-specific orchestration pattern exists.

## Decision

1. **Workflow modules are orchestration layers** — They coordinate user journeys across one or more capability modules and Core services. They do not duplicate build/deploy, device management, or registry infrastructure owned by Core.

2. **Composition rules**

   - Workflow modules MAY depend on Core APIs, shared schemas, and capability module **public** surfaces (CLI commands, MCP tools, provider ids, documented hooks).
   - Workflow modules MUST NOT import capability module internals or other workflow module internals.
   - Capability modules MUST NOT depend on workflow modules.
   - Workflow modules register in the module registry with `layer: workflow` and declare `dependsOn` capability module ids and required `provides` tags.

3. **Manifest example**

   ```json
   {
     "schemaVersion": "1.0.0",
     "id": "match-analysis",
     "displayName": "Match Analysis",
     "layer": "workflow",
     "dependsOn": ["ftc-replay", "vision-lab"],
     "provides": ["replay"],
     "summary": "Post-match session review composing replay and vision overlays."
   }
   ```

4. **Orchestration patterns**

   | Pattern | Description | Example |
   | ------- | ----------- | ------- |
   | **Session handoff** | Workflow opens or creates a replay session, then invokes capability tools | Match Analysis loads `.ftc-session.jsonl`, opens Vision result inspector |
   | **Readiness gate** | Workflow runs Core doctor/readiness before enabling capability features | Autonomous Studio checks deploy + opmode before path preview |
   | **Guided sequence** | Workflow presents steps; each step calls Core or capability commands | Driver Practice checklist |
   | **Advisory aggregation** | Workflow combines doctor, rules, and capability status | Season Support (ties REQ-RULE-001) |

5. **Surfaces** — Workflow modules may add VS Code command groups, CLI command groups, and MCP tools prefixed by workflow id (e.g. `ftc match-analysis`, MCP `match_analysis_*`). They should reuse JSON envelope conventions from Core/capabilities.

6. **Season Support** — Maps to REQ-RULE-001 (season handbook awareness). Composes Core config, advisory rule catalog, and Competition readiness — not a replacement for official FIRST publications.

7. **Driver Practice** — Composes Core deploy/logs, optional Sim (no-hardware), optional Vision — does not implement new vision or sim runtimes.

8. **Phase 5 delivery** — Workflow modules ship after capability foundations (Phase 3) and adapter framework (Phase 4). Each workflow epic owns its orchestration code; shared workflow utilities (if any) live in Core only when used by two or more workflows.

## Consequences

- Positive: Prevents workflow logic from entangling capability implementations.
- Positive: Module registry `dependsOn` enables doctor checks for missing capabilities.
- Negative: Workflow UX may feel fragmented until enough capabilities expose stable public hooks.
- Negative: Cross-workflow shared UI components need careful placement (extension package vs Core types only).
- Follow-up: Add workflow module manifests when Phase 5 epics start.
- Follow-up: Link Match Analysis and Autonomous Studio epics to this ADR in issue bodies.

## Links

- Orchestrator v2 §2 — Product taxonomy; §15 — GitHub planning
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0003](./0003-integration-registry.md) — Integration registry
- [ADR-0006](./0006-repository-layout-evolution.md) — Repository layout evolution
- `packages/shared/schemas/module-manifest.schema.json`
- [backlog-audit.md](../backlog-audit.md) — Epic map
- [#153 Match Analysis](https://github.com/The-Allsparks/ftc-dev-tools/issues/153), [#154 Autonomous Studio](https://github.com/The-Allsparks/ftc-dev-tools/issues/154)
