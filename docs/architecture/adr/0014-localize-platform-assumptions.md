# ADR-0014: Localize platform assumptions behind existing seams

## Status

Accepted (2026-08-01)

## Context

FTC Dev Tools targets a long-term vision as a workflow-centric robotics development platform, but Phase 0–4 delivery remains FTC-first. An architectural audit found that useful abstractions already exist (`ProjectAdapter`, `DeviceProvider`, `ProcessRunner`, capability registries) while **domain modules often bypassed them** — instantiating `OfficialFtcProjectAdapter` directly, duplicating mutation gates, and parsing ADB install output in multiple places.

ADR-0006 forbids big-bang package splits. ADR-0010 defines adapter contracts. ADR-0011 defers workflow orchestration to Phase 5. This ADR records **low-risk refactors** that tighten existing seams without speculative interfaces, placeholder providers, or new workflow engines.

## Decision

Apply the Rule of Three to extract only patterns with immediate FTC benefit:

| Change | Location | Why it reduces future rework |
| ------ | -------- | ---------------------------- |
| **`resolveProjectAdapter()`** | `packages/shared/src/adapters/resolve-project-adapter.ts` | Centralizes the default FTC adapter fallback. Domain functions accept optional `adapter?: ProjectAdapter`; surfaces (CLI/MCP context) inject once. Future adapters swap at boundaries without touching opmode, vision, Pedro, or hwmap logic. |
| **Optional adapter on domain APIs** | `opmode/*`, `pedro/detect`, `robot-config/list`, `vision/*`, `hwmap/codegen` | Aligns with ADR-0010 adapter contract. Enables unit tests with mock adapters today; avoids another sweep when a second project layout ships. |
| **`MODULE_LAYERS` + `isModuleLayer()`** | `packages/shared/src/modules/types.ts` | Single source for module taxonomy filtering in CLI and MCP. Prevents surface drift when ADR-0001 adds layers. |
| **`refuseMutationWithoutYes()`** | `packages/shared/src/process/mutation-guard.ts` | Consolidates `--yes` refusal into structured diagnostics shared by opmode, Pedro, and hwmap mutations. Keeps mutation policy consistent across CLI and MCP. |
| **`parseAdbInstallOutput()` / `detectAdbInstallErrorCode()`** | `packages/shared/src/devices/parse-adb-install.ts` | Normalizes deploy install evidence once. Used by `AdbDeviceProvider` and `errors/interpret.ts` — evidence-driven diagnostics instead of duplicated regex. |
| **`tryCreateOptionalDeviceProvider()`** | `packages/shared/src/devices/optional-provider.ts` | One best-effort device-provider helper for vision CLI and MCP. Surfaces stay thin. |
| **`executeGradleTask()` internal helper** | `packages/shared/src/services/build.ts` | Removes duplicated build/clean paths. Future build flags (e.g. module override) change one function. |
| **Shared `compareVersions()` for hub OS catalog** | `packages/shared/src/hub/parse-os-catalog.ts` | One version-sorting behavior for SDK and hub catalogs. |

### Explicit non-goals (unchanged)

- No workflow orchestration engine (ADR-0011 Phase 5).
- No second `ProjectAdapter` implementation or FRC/multi-language providers.
- No Wi‑Fi OS command abstraction layer.
- No plugin system for `interpret.ts` rules.
- No package split of `@ftc-dev-tools/shared` (ADR-0006).

## Consequences

- Positive: Platform assumptions (FTC layout, Gradle, ADB install parsing) are localized behind injectable adapters and structured evidence parsers.
- Positive: Surfaces compose Core through stable contracts — consistent with user-first, capability-driven design.
- Positive: All changes preserve backwards-compatible function signatures (optional parameters only).
- Negative: Default adapter remains FTC-specific; injection is opt-in until surfaces pass adapters everywhere.
- Follow-up: Pass `ctx.adapter` through remaining CLI/MCP mutation commands as those surfaces are touched.
- Follow-up: Extend `refuseMutationWithoutYes` to hub, sdk, and wifi mutations when those modules are next modified.

## Links

- [ADR-0001](./0001-product-taxonomy.md) — Product taxonomy
- [ADR-0006](./0006-repository-layout-evolution.md) — Incremental layout evolution
- [ADR-0010](./0010-adapter-requirements-contract.md) — Adapter requirements contract
- [ADR-0011](./0011-workflow-module-composition.md) — Workflow composition (deferred)
- [gap-analysis.md](./gap-analysis.md) — Orchestrator v2 alignment
