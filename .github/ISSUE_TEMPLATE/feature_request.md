---
name: Feature request
about: Suggest an improvement for FTC Dev Tools
title: "[feature] "
labels: enhancement
assignees: ""
---

## Problem

What FTC workflow problem does this solve for students, coaches, or mentors?

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
