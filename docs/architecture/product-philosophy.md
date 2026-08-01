# Product philosophy

This document describes how FTC Dev Tools should behave and how contributors should evaluate new work. It complements [Project principles](../project-principles.md) (team-specific safety and maturity) and [Architecture (0.1.0)](../architecture.md) (current package layout).

For separating competition, platform, language, framework, and capabilities in code, see [Architecture dimensions](./dimensions.md). For wrapping external tools, see [Integration expectations](./integration-expectations.md).

## Mission

FTC Dev Tools helps students spend more time solving robotics and engineering problems and less time fighting development tools, setup, deployment systems, fragmented applications, and incompatible workflows.

The product makes mature existing tools easy to discover, compare, configure, try, use, and understand. It does **not** force students into one framework, vendor, language, or workflow.

Today the shipped product is **FTC on Android with Java**. Long-term directions (Systemcore FTC, FRC, additional languages, simulation at scale, a capability marketplace) are architectural considerations only until real demand and validation justify implementation.

## Student-first goals

Organize the experience around what students and mentors are trying to accomplish:

| Goal                      | Examples in this repo                                        |
| ------------------------- | ------------------------------------------------------------ |
| Get the robot running     | Start Here, device connection, `ftc doctor`, deploy          |
| Write and test code       | OpMode create/list, build, TeamCode snippets                 |
| Diagnose a failure        | Friendly errors, doctor, vision diagnostics                  |
| Configure hardware        | Robot config, hardware map                                   |
| Build autonomous routines | Pedro Pathing scaffold, pathing detection                    |
| Set up vision             | Vision Lab, Limelight, VisionPortal, Dashboard interop       |
| Tune a mechanism          | Telemetry interop (Dashboard status/open), future Tuning Lab |
| Review a test session     | Vision sessions / replay foundations                         |
| Prepare for competition   | Readiness sidebar, milestone checklist, SDK update           |

Avoid making the primary navigation about implementation technologies (`adb`, Gradle task names, vendor SDK internals). Advanced details stay available in doctor output, `--verbose`, JSON envelopes, and architecture docs.

## Wrap, do not rewrite

FTC Dev Tools should integrate authoritative tools:

- **Build/deploy:** project's Gradle Wrapper, `adb`
- **Vision:** Limelight web UI, VisionPortal, FTC Dashboard, EasyOpenCV upstream patterns
- **Pathing:** Pedro Pathing library and Gradle coordinates
- **Hub/network:** REV hub tools and documented Wi‑Fi manage APIs where applicable

FTC Dev Tools owns:

- Discovery and compatibility checks
- Setup guidance and workflow orchestration
- Context propagation (project root, device serial, provider id)
- Error interpretation with evidence
- Safe invocation and mutation gates
- Student-facing presentation across CLI, extension, and MCP
- Agent-facing contracts (structured JSON, confirmation flags)

It should not duplicate mature functionality without a documented reason. When wrapping, show which upstream tool is involved and expose the underlying command or plan where practical ([ADR-0010](./adr/0010-adapter-requirements-contract.md)).

## Freedom of tool choice

Students should be able to try appropriate tools with low switching cost. Integrations must explain:

- What the tool does and when it is useful
- Advantages and limitations
- Compatibility (SDK versions, hardware)
- Install and uninstall steps
- What project files will change

Do not create lock-in through proprietary project formats, opaque generated code, or silent preference for one integration path. The integration registry and adapter contract exist to keep alternatives visible.

## Progressive disclosure

**Beginner surfaces** (Start Here, sidebar readiness, friendly errors) show the next useful action and plain-language explanations.

**Advanced surfaces** (CLI `--json`, MCP tools, verbose logs, doctor facts, architecture docs) expose exact commands, raw tool output, versions, configuration, evidence, source locations, and recovery actions.

Simplicity must not remove technical transparency.

## Transparency and scaffolding

Difficult workflows should be approachable without hiding what happens:

- Deploy dry-run lists planned steps before mutating a device
- Mutations require `--yes` or explicit UI confirmation
- Build output can show the Gradle command being run
- Integration adapters support dry-run / preview where writes occur

Students should be able to graduate from FTC Dev Tools to using Gradle, `adb`, and vendor tools directly.

## Evidence-driven diagnostics

Diagnostics distinguish:

| Kind                      | Example                                   |
| ------------------------- | ----------------------------------------- |
| Observed fact             | `adb devices` list, Gradle exit code      |
| Parsed evidence           | `parseAdbInstallOutput()`, Limelight JSON |
| Deterministic calculation | Version comparison in SDK/hub catalog     |
| Heuristic                 | Doctor warn when JAVA_HOME unset          |
| Likely cause              | Friendly error title from rule match      |
| Speculation               | Not shown as certainty                    |

Recommendations should cite supporting evidence. Correlation alone is not a root-cause claim. Replay and vision events follow [ADR-0008](./adr/0008-replay-observations-vs-hypotheses.md).

## Mutation safety

No integration may silently:

- Select among multiple robots
- Deploy to an ambiguous target
- Change robot configuration, network credentials, or hub OS
- Install or remove dependencies
- Modify source code
- Update firmware or OS images
- Activate vision pipelines or start robot movement

Mutations must be explicit, previewable where practical, cancellable, and recoverable (backups for OpMode/hwmap overwrites, no automatic uninstall on signature conflict).

## Context continuity

The architecture should allow future linking of:

workspace → project → source revision → build → artifact → deployment → robot → runtime session → logs → telemetry → diagnostics → operator notes

Current types (`BuildResult`, device serial, replay session schema, vision CLI envelopes) should not conflate unrelated concepts in ways that block these relationships. A full observability system is out of scope until validated need; see [ADR-0012](./adr/0012-telemetry-recording-foundations.md).

## Capability-driven architecture

Features should depend on declared capabilities, not scattered platform string checks.

Prefer:

- `canBuild`, `canDeploy`, `canStreamLogs`, `canInspectHardware`
- Integration manifest `capabilities` and adapter operations
- Provider registries for vision and telemetry

Avoid generic business logic like `if (platform === "ftc")` or `if (language === "java")`. Platform-specific checks belong in adapters (`OfficialFtcProjectAdapter`, `AdbDeviceProvider`) and integration modules.

Module layers (core, capability, workflow, adapter) are defined in [ADR-0001](./adr/0001-product-taxonomy.md) and `MODULE_LAYERS` in shared code.

## Non-goals

Unless redesigned with explicit safety review, FTC Dev Tools will not:

- Become a generalized robotics platform before FTC Android is excellent
- Ship placeholder Systemcore, FRC, C++, or Python adapters
- Build a plugin marketplace or dynamic plugin runtime
- Replace Android Studio, REV Hub Tool, Limelight web UI, or official FIRST publications
- Use AI as the default error classification path
- Perform automatic firmware flash, factory reset, or silent multi-device deploy

## How contributors should evaluate proposed features

Before opening or approving work, answer:

1. **Student problem:** Which student or mentor goal does this serve?
2. **Friction reduction:** How does it reduce time spent on toolchain vs robotics?
3. **Wrap vs rewrite:** Is there an authoritative upstream tool to integrate?
4. **Ownership:** What external system owns the underlying behavior?
5. **Evidence:** What hardware or user validation will prove it works?
6. **New assumptions:** Does it introduce a platform, language, framework, vendor, or tool lock-in?
7. **Mutation risk:** What can go wrong on a real robot or team laptop?
8. **Safe failure:** How do unsupported or ambiguous cases fail without silent damage?

Use [Architecture dimensions](./dimensions.md) to place the feature in the right layer. Use [Integration expectations](./integration-expectations.md) for new external tools.

Issue and pull request templates include shorter versions of these prompts.

## Success metrics

Prefer outcomes that reflect student time on robotics tasks.

### Primary metrics

| Metric                                                         | Why it matters                          |
| -------------------------------------------------------------- | --------------------------------------- |
| Time from clean computer to first successful build             | Setup friction                          |
| Time from project open to first successful deployment          | Golden path                             |
| Time from failure to actionable explanation                    | Diagnostic quality                      |
| Time from idea to physical robot test                          | End-to-end workflow                     |
| % of common failures recovered without mentor help             | Error design                            |
| External teams completing the golden path                      | General usefulness beyond The Allsparks |
| Reliability across repeated build/deploy/log cycles            | Trust                                   |
| Safe try-and-remove of an integration                          | Choice preservation                     |
| Workflows completed without understanding underlying toolchain | Scaffolding success                     |

Measure these through structured onboarding feedback, issue themes, doctor/deploy telemetry (when privacy-respecting), and physical testing checklists — not by counting features shipped.

### De-emphasized metrics

Do not optimize for:

- Number of CLI subcommands or MCP tools
- Count of integrations without hardware validation
- Roadmap issue volume
- Supported technology names without validated workflows

Feature maturity labels in [feature-maturity.md](../feature-maturity.md) remain the honest signal for what is mock-tested vs Control Hub validated.

## Related documents

- [Project principles](../project-principles.md)
- [Architecture dimensions](./dimensions.md)
- [Integration expectations](./integration-expectations.md)
- [Feature maturity](../feature-maturity.md)
- [Physical device testing](../physical-device-testing.md)
- [ADRs](./adr/)
