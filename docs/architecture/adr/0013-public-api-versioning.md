# ADR-0013: Public API versioning

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §7 requires versioning APIs and schemas independently. §19 completion criteria include **public APIs versioned** alongside schema versioning. [ADR-0005](./0005-versioned-shared-schemas.md) covers data schema versioning only.

FTC Dev Tools exposes multiple public surfaces:

- npm package `@ftc-dev-tools/shared` (programmatic imports)
- `ftc` CLI commands and flags
- MCP tool names and JSON result shapes
- VS Code extension commands and configuration keys

Today all surfaces share npm package version **0.1.0** with no independent API version field. [repository-inventory.md](../repository-inventory.md) lists "Independent API versioning" as a Phase 2 gap.

Breaking CLI or MCP changes affect agents, CI, and mentor scripts independently of schema or package semver.

## Decision

1. **Three version axes** — maintain separately:

   | Axis                   | Example                            | Governs                                    |
   | ---------------------- | ---------------------------------- | ------------------------------------------ |
   | **Package semver**     | `0.1.0`                            | npm release, extension marketplace version |
   | **Schema version**     | `1.0.0` in `$id` / `schemaVersion` | JSON documents (ADR-0005)                  |
   | **Public API version** | `2026-07-30` or `1.x`              | CLI, MCP, extension command contracts      |

2. **Public API version identifier** — use calendar-based `apiVersion` string (`YYYY-MM-DD`) for MCP/CLI JSON envelopes until 1.0 stable, then optional semver. Every structured JSON response from CLI (`--json`) and MCP tools includes:

   ```json
   {
     "apiVersion": "2026-07-30",
     "schemaVersion": "1.0.0",
     "ok": true,
     "data": {}
   }
   ```

   Existing commands without envelopes migrate opportunistically; new commands MUST include `apiVersion`.

3. **Compatibility policy**

   | Change type                                                | Policy                                        |
   | ---------------------------------------------------------- | --------------------------------------------- |
   | Add optional CLI flag                                      | Compatible — same API version                 |
   | Add MCP tool                                               | Compatible                                    |
   | Add required JSON field in response                        | Minor API bump                                |
   | Rename/remove CLI flag or MCP tool                         | Major API bump; deprecate first release cycle |
   | Change `--json` envelope shape                             | Major API bump                                |
   | `@ftc-dev-tools/shared` exported function signature change | Package semver + API changelog entry          |

4. **Deprecation** — Deprecated CLI commands and MCP tools remain functional for at least one minor package release with console/tool description warning. Removal requires major package version or documented breaking release.

5. **Module compatibility** — Capability and workflow modules declare `supportedFtcDevToolsVersions` in manifests (integration and module schemas). Doctor warns when module metadata requires a newer API version than the running CLI.

6. **Documentation** — Maintain `docs/api-changelog.md` (to be created in Phase 6) listing API version bumps. Schema changelog remains with schema files or ADR-0005 appendix.

7. **CI (Orchestrator §18)** — Phase 6 adds:
   - Snapshot tests for MCP tool input/output schemas
   - CLI `--json` golden files keyed by `apiVersion`
   - Package export surface check (typedoc or explicit export list)

8. **Relationship to schemas** — API version does not replace `schemaVersion` inside domain payloads. A single MCP response may carry both `apiVersion` (transport envelope) and nested `schemaVersion` (e.g. doctor report, session header).

## Consequences

- Positive: Agents and automation can pin `apiVersion` independently of npm install version.
- Positive: Aligns with completion criterion §19 without conflating schema and transport evolution.
- Negative: Maintainers track three changelogs until tooling consolidates.
- Negative: Retrofitting envelopes onto 50+ extension commands is incremental work.
- Follow-up: Add `apiVersion` to shared JSON envelope helper in `@ftc-dev-tools/shared`.
- Follow-up: Document current baseline `apiVersion` when first envelope ships repo-wide.

## Links

- Orchestrator v2 §7 — Architecture principles; §18 — CI; §19 — Completion criteria
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0005](./0005-versioned-shared-schemas.md) — Versioned shared schemas
- [ADR-0006](./0006-repository-layout-evolution.md) — Repository layout evolution
- [repository-inventory.md](../repository-inventory.md) — Gap matrix
- [#142 Core Platform epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/142)
