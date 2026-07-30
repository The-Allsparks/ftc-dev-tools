# ADR-0006: Repository layout evolution

## Status

Proposed

## Context

Orchestrator v2 suggests layout:

```text
extensions/ packages/ integrations/ workflows/ robot/ schemas/ docs/
```

The current repository uses:

```text
packages/{shared, cli, mcp, vscode-extension}/ docs/ examples/ scripts/
```

A big-bang directory restructure would risk breaking CI, releases, and contributor familiarity without immediate user benefit.

## Decision

1. **Adapt to the current repository** — evolve incrementally; do not force the suggested layout in one change.

2. **Phase 2+ moves** (only after review):
   - New adapter code may land in `packages/shared/src/adapters/` or a future `packages/integrations-*` workspace package.
   - Schemas may move to top-level `schemas/` when cross-language generation justifies it.
   - `robot/` Java templates appear when robot-side bridge code is required (ADR-0002).
   - Capability modules may become workspace packages (`@ftc-dev-tools/vision`, etc.) when API surface stabilizes.

3. **Preserve working behavior** — npm workspace names, CLI binary, extension id, and MCP server name remain stable through layout changes.

4. **No fork of upstream FTC libraries** — integrations stay adapters in this repo unless explicitly approved.

5. **Rollback** — layout changes ship behind normal PR review; feature flags or optional packages where splitting would otherwise break single-package installs.

## Consequences

- Positive: Phase 1 delivers planning without disruptive moves.
- Positive: Matches "preserve working behavior" and rookie simplicity principles.
- Negative: Temporary mismatch between orchestrator diagram and repo tree until Phase 2–3.
- Follow-up: Revisit layout when integration registry (ADR-0003) lands.

## Links

- [repository-inventory.md](../repository-inventory.md)
- [architecture.md](../../architecture.md) — current monorepo layout
