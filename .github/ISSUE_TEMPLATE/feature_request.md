---
name: Feature request
about: Suggest an improvement for FTC Dev Tools
title: "[feature] "
labels: enhancement
assignees: ""
---

## Problem

What FTC workflow problem does this solve for students, coaches, or mentors?

## Product alignment

1. **Student/mentor goal:** (get robot running, write code, diagnose, configure hardware, vision, autonomous, tune, review session, …)
2. **Friction reduction:** How does this reduce toolchain friction?
3. **Wrap vs rewrite:** Is there an existing tool FTC Dev Tools should integrate instead of reimplementing?
4. **Upstream ownership:** What owns the underlying functionality today?
5. **Validation evidence:** What will prove this works on real hardware or with real teams?
6. **New assumptions:** Platform, language, framework, vendor, or tool lock-in?
7. **Mutation/safety risks:** What could change on a robot, network, or project without explicit consent?
8. **Safe failure:** How should ambiguous or unsupported cases behave?

See [docs/architecture/product-philosophy.md](../../docs/architecture/product-philosophy.md).

## Scope

- Is this specific to one team, or generally useful to other FTC teams?
- Does it affect robot hardware, networking, firmware, or deployment?
- Has it been tested on physical FTC hardware?
- What FTC SDK version and host operating system were used (if applicable)?

## Proposed solution

## Alternatives considered

## Roadmap check

Prefer filing against current integrated surfaces or planned work when relevant:

**Integrated (improve/fix bugs welcome):** FTC SDK update, Wi-Fi helpers, Control Hub OS helpers, Pedro Pathing, OpMode/config/hardware-map tooling, MCP server, build/deploy/logs/doctor.

**Planned / investigative:** telemetry / FTC Dashboard interoperability, JDWP debugger investigation, richer Logcat + diagnostic bundles, TeamCode unit-test starters, SDK sample browser.

**Out of scope unless redesigned:** Control Hub firmware flash / factory reset as an automatic action; silent multi-device selection; auto-uninstall; AI-generated fixes as the default error path.

See [docs/feature-maturity.md](../../docs/feature-maturity.md) and [docs/parity-audit.md](../../docs/parity-audit.md).

Team-specific robot code, strategy, credentials, and private operations belong outside this repository. See [docs/team-use.md](../../docs/team-use.md).

## Labels (maintainers)

After filing, add roadmap labels per [docs/issue-labels.md](../../docs/issue-labels.md): one **priority** (`priority: P0`–`P2`), at least one **surface** (`shared-core`, `vscode`, `cli`, `mcp`, or `vision`), and any cross-cutting tags (`student-ux`, `testing`, etc.). Update [scripts/issue-label-catalog.json](../../scripts/issue-label-catalog.json) for new tracking issues.
