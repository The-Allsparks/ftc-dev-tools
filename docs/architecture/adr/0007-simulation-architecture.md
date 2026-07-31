# ADR-0007: Simulation architecture

## Status

Accepted (Gate A approved 2026-07-30)

## Context

Orchestrator v2 §10 requires FTC Sim to register runtimes and virtual hardware, expose virtual cameras through the frame provider registry, and remain decoupled from Vision Lab. [ADR-0004](./0004-provider-based-composition.md) establishes provider-based composition but does not specify simulation runtime lifecycle, virtual hardware contracts, or how Sim participates in no-hardware validation workflows.

Phase 3 ships a simulation provider placeholder (`sim:adapter-placeholder`) in the provider catalog. No simulator adapter or virtual hardware implementation exists yet ([#145](https://github.com/The-Allsparks/ftc-dev-tools/issues/145), [#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234)).

FTC teams use third-party simulators (Road Runner trajectory viz, community FTC simulators, etc.). FTC Dev Tools must integrate through adapters rather than shipping a monolithic physics engine.

## Decision

1. **FTC Sim is a capability module** that owns simulation orchestration UX, runtime selection, and virtual hardware registration — not upstream simulator implementations.

2. **Simulation runtime provider contract** — Sim registers one or more runtimes via the Core simulation provider registry. Each runtime descriptor includes:
   - Stable id (e.g. `sim:road-runner-viz`, `sim:ftc-simulator-x`)
   - Display name, adapter source integration id
   - Supported modes: `headless`, `interactive`, `validation-only`
   - Capability flags: virtual motors, virtual sensors, virtual cameras, telemetry export
   - Lifecycle hooks: `start`, `stop`, `reset`, `step` (optional; adapter-defined)

3. **Virtual hardware** — Sim runtimes register virtual devices through Core abstractions:
   - **Motors/sensors:** exposed as simulation telemetry streams (not ADB device spoofing in Phase 1 of Sim).
   - **Virtual cameras:** register frame providers (e.g. `frame:sim-virtual:<runtimeId>`) in the frame provider registry. Vision Lab and Replay consume frames by provider id — never by importing Sim modules.

4. **No Vision ↔ Sim dependency** — Vision resolves camera streams from the frame registry. Sim registers providers; Vision does not call Sim APIs directly. Replay may consume simulation telemetry events through the session event stream ([ADR-0012](./0012-telemetry-recording-foundations.md), [ADR-0008](./0008-replay-observations-vs-hypotheses.md)).

5. **Adapter integration** — Third-party simulators implement the runtime contract inside integration adapters ([ADR-0010](./0010-adapter-requirements-contract.md)). Adapters declare `simulationSupport: true` in the integration registry ([ADR-0003](./0003-integration-registry.md)). Evaluation criteria follow Orchestrator §14 (maintenance, SDK compatibility, replay compatibility).

6. **No-hardware validation mode** — A workflow where Core + Sim run doctor/build checks and optional static validation without physical hardware. Does not replace hardware validation milestones in [feature-maturity.md](../../feature-maturity.md).

7. **Safety** — Sim runtimes must not deploy to physical Robot Controller without explicit user confirmation. Default Sim sessions are desktop-only.

## Consequences

- Positive: Teams without Sim still use Core + Vision; Sim is optional.
- Positive: Multiple simulator adapters can coexist; runtime selection is explicit.
- Positive: Virtual camera path reuses existing frame provider architecture (VISION-01).
- Negative: Runtime contract design must precede first simulator adapter implementation.
- Negative: Full physics simulation is out of scope; adapter quality varies by upstream project.
- Follow-up: Define TypeScript `SimulationRuntimeProvider` interface ([#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234)).
- Follow-up: Prototype no-hardware validation mode under FTC Sim epic #145.

## Links

- Orchestrator v2 §10 — Simulation
- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0003](./0003-integration-registry.md) — Integration registry
- [ADR-0004](./0004-provider-based-composition.md) — Provider-based composition
- [ADR-0010](./0010-adapter-requirements-contract.md) — Adapter requirements contract
- [vision-providers.md](../vision-providers.md) — Frame and simulation registries
- [#145 FTC Sim epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/145)
- [#234 SIM-01: Define simulation runtime provider interface](https://github.com/The-Allsparks/ftc-dev-tools/issues/234)
