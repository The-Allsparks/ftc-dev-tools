# ADR-0004: Provider-based composition

## Status

Accepted

## Context

Vision, simulation, and replay share data (camera frames, telemetry, hardware state) but serve different user goals. Direct dependencies between capability modules (e.g. Vision importing Sim internals) create coupling and complicate testing and optional installation.

Orchestrator v2 requires:

- FTC Sim exposes virtual hardware and registers runtimes; virtual cameras go through a frame registry.
- Vision consumes cameras through providers.
- Replay consumes events.
- No direct Vision ↔ Sim dependency.

## Decision

1. **Provider registries** in Core (or Core-adjacent stable APIs) for:
   - Camera / frame providers
   - Telemetry streams
   - Simulation runtimes
   - Recording and replay session backends

2. **Capabilities register providers** at activation time; consumers resolve by id or capability tag.

3. **No cross-capability imports** — Vision Lab, FTC Sim, and FTC Replay depend on Core provider interfaces and schemas only.

4. **Adapters** supply vendor-specific implementations (Limelight, VisionPortal, etc.) that plug into Vision providers without Vision knowing adapter internals.

5. **Observations vs hypotheses** in Replay: recorded data distinguishes measured observations from inferred/debug hypotheses (Replay-specific schema concern, Phase 3).

## Consequences

- Positive: Optional modules — teams without Sim still use Core + Vision.
- Positive: Testability via mock providers (extends existing DI pattern).
- Negative: Registry design must precede Vision Lab panel and Sim integration work.
- Follow-up: Define provider TypeScript interfaces in Phase 2; Java bridge providers follow ADR-0002.

## Links

- [architecture.md](../../architecture.md) — existing DI with `ProjectAdapter`, `DeviceProvider`
- VISION-01 in issue catalog — vision provider architecture
