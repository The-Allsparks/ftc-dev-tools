# ADR-0003: Integration registry

## Status

Accepted

## Context

Today, CLI commands and MCP tools are registered manually:

- CLI: `registerXCommand(program)` imports in `packages/cli/src/index.ts`
- MCP: explicit `server.registerTool(...)` in `packages/mcp/src/server.ts`

Pedro Pathing (`packages/shared/src/pedro/`) is the only third-party integration and follows an ad hoc detect/add/scaffold pattern without shared adapter metadata.

Orchestrator v2 requires every adapter to register: id, display name, category, capabilities, supported SDK versions, supported FTC Dev Tools versions, robot/desktop languages, replay/simulation support flags, documentation links, experimental/deprecated flags.

## Decision

Introduce an **integration registry** (Phase 2 implementation) that:

1. Stores adapter metadata in a versioned manifest format (JSON Schema).
2. Is populated by adapter modules at build time or via explicit registration API — not by scattered string literals.
3. Drives: module manager UI, dependency resolution, project detection hints, code generation entry points, and generated documentation.
4. Exposes read-only registry queries to CLI, MCP, and extension for `list integrations`, doctor checks, and agent tools.

**Migration:** Pedro becomes the reference adapter migrated into the framework; new adapters (Road Runner, Dashboard, etc.) register through the same contract.

**Non-goals in Phase 1:** No registry code; this ADR defines the target only.

## Consequences

- Positive: Single source of truth for supported libraries and capabilities.
- Positive: Enables capability matrix generation from registry data.
- Negative: One-time migration cost for CLI/MCP registration and Pedro refactor.
- Follow-up: Implement registry in Phase 2; link to Adapter Framework epic.

## Links

- `packages/cli/src/index.ts` — manual command registration
- `packages/mcp/src/server.ts` — manual tool registration
- `packages/shared/src/pedro/` — pre-registry adapter pattern
