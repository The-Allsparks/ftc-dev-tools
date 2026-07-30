# ADR-0001: Product taxonomy

## Status

Accepted

## Context

FTC Dev Tools is one product that must present a unified experience while supporting many third-party FTC libraries, capability areas (vision, simulation, replay), and composed workflows. The current monorepo implements most logic in `packages/shared` without explicit module boundaries.

Orchestrator v2 defines four layers: **Core Platform**, **Capability Modules**, **Workflow Modules**, and **Integration Adapters**.

## Decision

Adopt the following taxonomy:

1. **Core Platform** — project discovery, workspace analysis, build/deploy, ADB/device management, diagnostics, logging, readiness, module registry, public API, telemetry/recording foundations. Core must remain useful alone.

2. **Capability Modules** — Vision Lab, FTC Sim, FTC Replay, Hardware Lab, Tuning Lab. Each depends only on stable Core APIs and shared schemas.

3. **Workflow Modules** — Autonomous Studio, Driver Practice, Match Analysis, Season Support. These compose capabilities; they do not replace Core.

4. **Integration Adapters** — SDK, VisionPortal, Pedro, Road Runner, NextFTC, FTCLib, FTC Dashboard, Limelight Vision, etc. Adapters register metadata and implement detect/install/validate/codegen; they do not create direct dependencies between capabilities.

**Composition rules:**

- Capabilities must not depend directly on one another when registries or providers can be used.
- Workflow modules compose capabilities through Core and workflow-specific orchestration.
- Adapters integrate upstream libraries without forking unless explicitly approved.

## Consequences

- Positive: Clear ownership for epics, docs, and future package splits.
- Positive: Rookie workflow stays on Core + thin surfaces.
- Negative: Requires registry and provider work (Phase 2–3) before full modular enforcement.
- Follow-up: Map existing `packages/shared/src/` folders per [repository-inventory.md](../repository-inventory.md).

## Links

- [repository-inventory.md](../repository-inventory.md)
- [backlog-audit.md](../backlog-audit.md)
