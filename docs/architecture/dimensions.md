# Architecture dimensions

This guide explains how to classify features so competition, robot platform, programming language, framework, build system, external tools, and capabilities stay separate. The goal is to prevent monolithic adapters that mix unrelated concepts and force rework when a second platform eventually ships.

**This is design guidance, not a mandate to implement every dimension as a TypeScript type today.** Add types only when the current codebase has a concrete second consumer or a real branch in behavior.

## Why separate dimensions

A single "FTC project" conflates many independent choices:

```text
Competition  →  which rulebook and season context (FTC vs FRC)
Platform     →  runtime environment (Android FTC vs Systemcore vs roboRIO)
Language     →  source language (Java today; C++/Python possible elsewhere)
Framework    →  application structure (FTC OpMode, Commands, timed robot, …)
Build system →  how artifacts are produced (Android Gradle, GradleRIO, …)
Provider     →  upstream tool or library (Limelight, Pedro, Dashboard, adb)
Capability   →  what FTC Dev Tools can do (canDeploy, canStreamLogs, …)
```

Mixing these in one adapter or UI module makes it hard to add Systemcore FTC later (same competition, different platform and build system) or FRC (different competition, overlapping tooling patterns).

## Dimension definitions

### Competition profile

The FIRST program and rule context.

- **Examples (implemented):** FTC
- **Examples (future, not implemented):** FRC

Competition affects season rules, legal hardware, and documentation links — not Gradle task names.

### Robot platform

Where team code runs and how it is deployed.

- **Examples (implemented):** Android FTC (Control Hub / Driver Hub / RC phone via `adb`)
- **Examples (future, not implemented):** Systemcore FTC, roboRIO

Platform-specific code belongs in adapters and device providers (`OfficialFtcProjectAdapter`, `AdbDeviceProvider`), not in vision diagnostics or workflow UI.

### Programming language

Language of the team's robot source.

- **Examples (implemented):** Java (TeamCode)
- **Examples (future, not implemented):** C++, Python

TypeScript in `packages/shared` orchestrates; it is not the robot programming language. Java codegen for OpModes and vision lives behind adapter/codegen operations ([ADR-0002](./adr/0002-java-typescript-boundary.md)).

### Framework

Application structure and lifecycle model.

- **Examples (implemented):** FTC OpMode (LinearOpMode, `@TeleOp`, `@Autonomous`)
- **Examples (future, not implemented):** WPILib Commands, timed robot, NextFTC patterns

Framework affects templates and detection heuristics, not adb parsing.

### Build system

How compile artifacts are produced.

- **Examples (implemented):** Android Gradle (`gradlew`, `assembleDebug`, APK outputs)
- **Examples (future, not implemented):** GradleRIO for Systemcore FTC or FRC

Build orchestration uses `ProjectAdapter.getBuildCommand()` and `ProcessRunner` — not hard-coded Gradle strings in the extension.

### External tool or provider

An upstream executable, library, or service FTC Dev Tools wraps.

- **Examples:** `adb`, Limelight web API, FTC Dashboard, Pedro Pathing Maven coordinates, REV hub utilities

Each integration should follow [Integration expectations](./integration-expectations.md) and register in the integration registry ([ADR-0003](./adr/0003-integration-registry.md)).

### Capability

A boolean or structured ability FTC Dev Tools exposes to surfaces and agents.

- **Examples:** `canBuild`, `canDeploy`, `canStreamLogs`, `canInspectHardware`, `canGenerateCode`, `canMutateConfiguration`, vision provider ids, replay support flags

Capabilities come from manifests, adapter implementations, and Core services — not from `if (ftc)` in UI code.

## Illustrative combinations

Label **future** rows clearly; none are implemented support promises.

### Current FTC Android (shipped)

| Dimension                   | Value                              |
| --------------------------- | ---------------------------------- |
| Competition                 | FTC                                |
| Platform                    | Android FTC                        |
| Language                    | Java                               |
| Build system                | Android Gradle                     |
| Framework                   | FTC OpMode                         |
| Primary deploy transport    | adb (USB / wireless)               |
| Representative capabilities | canBuild, canDeploy, canStreamLogs |

### Possible future Systemcore FTC (example only)

| Dimension        | Value                                    |
| ---------------- | ---------------------------------------- |
| Competition      | FTC                                      |
| Platform         | Systemcore                               |
| Language         | Java                                     |
| Build system     | GradleRIO                                |
| Framework        | FTC OpMode (or evolution per FIRST docs) |
| Deploy transport | TBD — not adb/APK                        |

Would require a **new** `ProjectAdapter` and device/deploy provider; existing OpMode and vision modules should accept adapter injection rather than forking.

### Possible future FRC (example only)

| Dimension    | Value                                 |
| ------------ | ------------------------------------- |
| Competition  | FRC                                   |
| Platform     | roboRIO or Systemcore                 |
| Language     | Java, C++, or Python                  |
| Build system | GradleRIO                             |
| Framework    | Commands, timed robot, or team choice |

Would be a separate competition profile; do not stretch `OfficialFtcProjectAdapter` to cover FRC.

## Where concepts live in this repository

| Dimension     | Current home                                     | Notes                                    |
| ------------- | ------------------------------------------------ | ---------------------------------------- |
| Competition   | Product docs, season-aware rules (future)        | Not a runtime enum today                 |
| Platform      | `ProjectAdapter`, `DeviceProvider`               | FTC Android only                         |
| Language      | Java templates in `opmode/`, `vision/codegen/`   | TypeScript boundary per ADR-0002         |
| Framework     | OpMode templates, Pedro scaffold                 | FTC OpMode assumptions explicit in paths |
| Build system  | `OfficialFtcProjectAdapter`, `services/build.ts` | Gradle Wrapper invocation                |
| External tool | Integration adapters, vision providers           | Registry + ADR-0010                      |
| Capability    | Manifest `capabilities`, provider registries     | Prefer over platform if-checks           |

## Anti-patterns

| Anti-pattern                                                  | Why it hurts             | Prefer                                                                              |
| ------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `OfficialFtcProjectAdapter` imported in domain modules        | Platform leak            | `resolveProjectAdapter(options?.adapter)`                                           |
| UI checks for `TeamCode` folder layout                        | Build/platform leak      | Call shared inspect/build services                                                  |
| Vision module parses adb install output                       | Duplicate evidence       | `parseAdbInstallOutput()`                                                           |
| Generic interface with one implementation and no test doubles | Speculative abstraction  | Concrete class until second consumer                                                |
| Empty `FrcProjectAdapter` stub                                | Speculative architecture | Add adapter when FRC is validated in scope                                          |
| "Device" meaning adb serial in user copy                      | Platform leak in UX      | "Robot device" or "connected device" in student text; keep adb in technical details |

Recent refactors documented in [ADR-0014](./adr/0014-localize-platform-assumptions.md) address several of these for the current FTC tree.

## Decision checklist for new code

1. Which **student goal** does this serve? ([product-philosophy](./product-philosophy.md))
2. Which **dimension** changed — platform, provider, or capability?
3. Does logic belong in Core, a capability module, an adapter, or a surface (CLI/extension/MCP)?
4. If adding a branch, is it capability-driven or a platform name check?
5. Will a second platform reuse this module unchanged with a different adapter?

When in doubt, keep platform specifics in the adapter layer and pass interfaces inward.

## Related documents

- [Product philosophy](./product-philosophy.md)
- [Integration expectations](./integration-expectations.md)
- [ADR-0001 Product taxonomy](./adr/0001-product-taxonomy.md)
- [ADR-0010 Adapter requirements](./adr/0010-adapter-requirements-contract.md)
- [ADR-0014 Localize platform assumptions](./adr/0014-localize-platform-assumptions.md)
- [Repository inventory](./repository-inventory.md)
