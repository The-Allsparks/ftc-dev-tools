# ADR-0012: Telemetry and recording session foundations

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 assigns **telemetry/session foundations** and **recording foundations** to Core Platform (§2). §9 requires versioned schemas for telemetry, recording, and sessions. §11 defines replay domains that depend on a shared session model.

[ADR-0005](./0005-versioned-shared-schemas.md) covers schema versioning policy. Phase 3 shipped session header and event schemas (v1.0.0), validation helpers in `packages/shared/src/replay/`, and replay provider registration — but the split between **Core infrastructure** and **FTC Replay capability** behavior is undocumented.

Telemetry today is fragmented: Logcat parsing, Limelight HTTP results, FTC Dashboard research spike, and future robot bridge streams lack a unified Core telemetry contract. Platform session capture pipeline work tracks under [#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233).

## Decision

1. **Core owns session and telemetry infrastructure**

   | Concern                                         | Owner | Notes                                                       |
   | ----------------------------------------------- | ----- | ----------------------------------------------------------- |
   | Session header schema                           | Core  | `session.schema.json`                                       |
   | Session event envelope                          | Core  | `session-event.schema.json`                                 |
   | Event validation, JSONL parsing                 | Core  | `packages/shared/src/replay/` validators                    |
   | Session id generation, limits, capability flags | Core  | `REPLAY_SESSION_LIMITS`, `REPLAY_CAPABILITIES`              |
   | Telemetry provider registry                     | Core  | Provider descriptors; adapters register streams             |
   | Recording writer interface (future)             | Core  | Bounded disk writer, redaction hooks, `.gitignore` guidance |
   | Replay backend registry                         | Core  | e.g. `replay:session-file` descriptor                       |

2. **FTC Replay capability owns**

   | Concern                             | Owner                 | Notes                                                      |
   | ----------------------------------- | --------------------- | ---------------------------------------------------------- |
   | Capture pipeline orchestration      | FTC Replay            | Subscribes to telemetry/frame providers                    |
   | Playback / seek / export            | FTC Replay            | Consumes session files                                     |
   | Replay-specific UX                  | FTC Replay + surfaces | CLI `ftc replay record`, future transport controls         |
   | Domain event producers coordination | FTC Replay            | Ensures ordering, sequence numbers, recordClass (ADR-0008) |

3. **Capability modules as event producers** — Vision Lab, Hardware Lab, Sim adapters, and integration adapters emit session events through Core writer APIs. They do not define alternate session file formats.

4. **Telemetry stream model** — Telemetry providers register with Core (`telemetry:*` ids). Each descriptor includes:
   - Source type: `logcat`, `http`, `bridge`, `sim`, `dashboard`
   - Schema reference for payload shape (versioned)
   - Default `recordClass` for events ([ADR-0008](./0008-replay-observations-vs-hypotheses.md))
   - Sampling / rate limits where applicable

5. **Recording foundations (not full replay)**

   - **Recording** = durable capture to session files while a session is active.
   - **Replay** = offline read, analysis, and playback of recorded sessions.
   - Core exposes recording hooks; FTC Replay implements end-to-end record/playback when capability flags enable `liveCapture`.

6. **Storage conventions**

   - Default session directory: `.ftc-dev-tools/sessions/` or user-configured path in `.ftc-dev.json`.
   - JSONL event files named `{sessionId}.ftc-session.jsonl`.
   - Document recommended `.gitignore` entries (shipped in replay docs).
   - No credentials in payloads (enforced by schema description and writer sanitization).

7. **Timestamps** — Session events use `timestampMs` (wall clock) and optional `monotonicMs` in v1.0.0. High-precision robot timestamps use ADR-0005 string/nanos encoding in payload fields when needed — not in the envelope integer fields.

8. **Java bridge** — Robot-side telemetry emission uses generated Java templates ([ADR-0002](./0002-java-typescript-boundary.md)) producing JSON matching session event payloads. Java classes live in user project or `robot/` templates, not desktop packages.

## Consequences

- Positive: One session format for Vision, Replay, Match Analysis, and agents.
- Positive: Core remains useful for validate-only replay workflows without full FTC Replay capture.
- Negative: Naming collision — `packages/shared/src/replay/` lives in Core today; may rename to `sessions/` when extracting FTC Replay module ([ADR-0006](./0006-repository-layout-evolution.md)).
- Negative: Unified telemetry schema work spans multiple epics (Dashboard, bridge, Logcat).
- Follow-up: Implement bounded session writer in FTC Replay epic ([#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)).
- Follow-up: Add `telemetry.sample` event kind in schema minor version.

## Links

- Orchestrator v2 §2 — Core responsibilities; §9 — Shared contracts; §11 — Replay domains
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0002](./0002-java-typescript-boundary.md) — Java–TypeScript boundary
- [ADR-0005](./0005-versioned-shared-schemas.md) — Versioned shared schemas
- [ADR-0008](./0008-replay-observations-vs-hypotheses.md) — Replay observations vs hypotheses
- [replay-session.md](../replay-session.md)
- [telemetry-spike.md](../../telemetry-spike.md)
- [#142 Core Platform](https://github.com/The-Allsparks/ftc-dev-tools/issues/142), [#143 FTC Replay](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)
- [#233 REPLAY-01: Define platform session capture pipeline](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)
