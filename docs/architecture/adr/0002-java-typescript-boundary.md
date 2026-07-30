# ADR-0002: Java–TypeScript boundary

## Status

Accepted

## Context

FTC robot code runs on Android in Java (or Kotlin in user projects). FTC Dev Tools desktop tooling runs in Node.js / TypeScript (CLI, extension, MCP). Replacing robot-side Java with desktop TypeScript would break compatibility with the official SDK and community libraries.

The repository currently contains **zero** Java sources; all integration today is via Gradle, ADB, and file patches from TypeScript.

## Decision

1. **Desktop runtime:** TypeScript only for CLI, extension, MCP, and shared services in this repo.

2. **Robot runtime:** Java (and user-project Kotlin) only for on-robot code. FTC Dev Tools may generate or patch Java in user projects but does not ship robot runtime logic in TypeScript.

3. **Cross-runtime communication:** Use versioned, language-neutral schemas (JSON Schema or equivalent) for telemetry, recording, sessions, module manifests, and project configuration.

4. **Dual implementations:** Every shared schema must have TypeScript and Java implementations where robot-side consumption is required. Java implementations may live in user-project templates, a future `robot/` package, or adapter-generated code — not in desktop packages.

5. **Timestamps:** Use string-encoded nanoseconds or separate seconds/nanos fields in schemas to avoid JavaScript integer precision loss.

## Consequences

- Positive: Preserves FTC ecosystem compatibility and mentor expectations.
- Positive: Clear split for CI (TS matrix today; Java schema validation in Phase 2).
- Negative: Requires schema pipeline and Java codegen/templates for robot bridge features.
- Follow-up: ADR-0005 defines schema versioning; Phase 2 adds first cross-language schemas.

## Links

- [project-principles.md](../../project-principles.md) — compatible with the FTC ecosystem
- [repository-inventory.md](../repository-inventory.md) — schema gaps
