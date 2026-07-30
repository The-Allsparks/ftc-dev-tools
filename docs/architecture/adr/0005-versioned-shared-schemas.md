# ADR-0005: Versioned shared schemas

## Status

Accepted

## Context

FTC Dev Tools today ships two JSON Schemas in `packages/shared/schemas/` (`ftc-dev.schema.json`, `doctor-report.schema.json`) with no independent versioning from the npm package version (0.1.0).

Orchestrator v2 requires versioned schemas for telemetry, recording, sessions, module manifests, and project configuration, with Java and TypeScript implementations and safe timestamp encoding.

## Decision

1. **Independent schema versioning** — each schema family carries a semver or calendar version in `$id` and a `schemaVersion` field in documents. Package version (0.1.0) does not imply schema version.

2. **Schema location** — evolve toward a dedicated `schemas/` tree (repo root or package) with generated TypeScript types and Java classes/templates. Phase 2 defines layout; existing schemas migrate without breaking `.ftc-dev.json` users.

3. **Compatibility policy** — minor schema versions add optional fields; major versions may break. Readers must reject unknown major versions with actionable errors.

4. **Timestamps** — prefer ISO-8601 strings with nanosecond precision or `{ seconds: string, nanos: number }` to avoid JS `Number` limits on nanosecond epoch values.

5. **CI** — Phase 2 adds validation: schema lint, TS validator tests, and Java sample round-trip where robot-side code exists.

## Consequences

- Positive: Robot and desktop can evolve on different cadences.
- Positive: Replay and telemetry files remain readable across tool versions.
- Negative: Maintainers must track schema changelog alongside API changelog.
- Follow-up: First new schemas (module manifest, session header) in Phase 2.

## Links

- `packages/shared/schemas/ftc-dev.schema.json`
- `packages/shared/schemas/doctor-report.schema.json`
- ADR-0002 — Java–TypeScript boundary
