# ADR-0008: Replay observations vs hypotheses

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §11 requires FTC Replay to record telemetry, logs, hardware state, vision data, simulation output, annotations, and diagnostics — and to **distinguish observations from hypotheses**.

[ADR-0004](./0004-provider-based-composition.md) mentions this distinction in one bullet but does not define semantics. [ADR-0005](./0005-versioned-shared-schemas.md) and the shipped session schemas (`session.schema.json`, `session-event.schema.json` v1.0.0) provide header and event envelopes without a `recordClass` or equivalent field. Phase 3 validates envelopes and declares replay capability flags; live capture and playback remain deferred ([#143](https://github.com/The-Allsparks/ftc-dev-tools/issues/143), [#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)).

Replay files may be used for debugging, mentor review, and agent analysis. Mixing measured sensor data with inferred or debug-only values without labeling creates false confidence in post-match analysis.

## Decision

1. **Two record classes** for all replay session events and derived artifacts:

   | Class | Definition | Examples |
   | ----- | ---------- | -------- |
   | **Observation** | Measured or directly captured data from robot, network, or registered providers at record time | Limelight `/results`, Logcat line, motor encoder reading, frame metadata hash, dashboard telemetry sample |
   | **Hypothesis** | Inferred, derived, debug-only, or tool-computed values not guaranteed to match on-robot ground truth | Pose estimate fusion, path planner preview, agent annotation, overlay alignment guess, replay-time interpolation |

2. **Schema encoding** — Session events gain a required field (proposed name: `recordClass`) with enum values `observation` | `hypothesis`. Default for new producers is `observation`. Hypothesis events must not be promoted to observations without re-capture.

3. **Source attribution** — Every event retains `sourceId` (provider or subsystem). Hypothesis events additionally SHOULD include `derivedFrom` (array of event sequence numbers or source ids) when the derivation chain is known.

4. **Replay domains** — Extend event `kind` taxonomy over time (minor schema versions per ADR-0005):

   | Domain | Initial kinds (v1.0.0+) | recordClass default |
   | ------ | ----------------------- | ------------------- |
   | Vision | `vision.diagnostic`, `vision.results`, `frame.metadata` | observation |
   | Session | `session.note`, `session.marker` | hypothesis (notes) or observation (markers) |
   | Telemetry | `telemetry.sample` (future) | observation |
   | Hardware | `hardware.state` (future) | observation |
   | Simulation | `sim.state` (future) | observation for sim output; hypothesis for derived viz |
   | Logs | `log.line` (future) | observation |
   | Annotations | `annotation.*` (future) | hypothesis |

5. **UI and export rules** — Vision Lab replay controls, Match Analysis, and export bundles must visually distinguish hypotheses (e.g. dashed overlays, "inferred" badge). Export manifests list observation and hypothesis counts separately.

6. **Agent/MCP consumption** — Read-only replay tools must surface `recordClass` in JSON output. Agents must treat hypothesis events as non-authoritative for hardware state claims.

7. **FTC Replay ownership** — The FTC Replay capability module owns replay semantics, playback providers, and capture pipeline orchestration. Core owns session infrastructure ([ADR-0012](./0012-telemetry-recording-foundations.md)). Vision Lab contributes vision-domain events but does not own replay file semantics.

## Consequences

- Positive: Mentors and agents can trust observation streams for post-match review.
- Positive: Debug overlays and tool inference can be recorded without polluting measured data.
- Negative: Requires schema minor version bump and producer updates across vision, telemetry, and sim adapters.
- Negative: Some edge cases (filtered vision results) need documented classification rules per adapter.
- Follow-up: Add `recordClass` to `session-event.schema.json` v1.1.0 ([#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)).
- Follow-up: Document per-adapter classification in integration adapter guides.

## Links

- Orchestrator v2 §11 — Replay
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0004](./0004-provider-based-composition.md) — Provider-based composition
- [ADR-0005](./0005-versioned-shared-schemas.md) — Versioned shared schemas
- [ADR-0012](./0012-telemetry-recording-foundations.md) — Telemetry and recording session foundations
- [replay-session.md](../replay-session.md) — Session schema foundation (VISION-13)
- [#143 FTC Replay epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)
- [#233 REPLAY-01: Define platform session capture pipeline](https://github.com/The-Allsparks/ftc-dev-tools/issues/233)
