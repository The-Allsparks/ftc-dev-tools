# 0.2 Rookie Onboarding — closure verification

This document closes meta [#45](https://github.com/The-Allsparks/ftc-dev-tools/issues/45) and epic [#46](https://github.com/The-Allsparks/ftc-dev-tools/issues/46) for milestone **0.2 Rookie Onboarding**. It records what shipped, how to verify it, and what remains explicitly deferred.

## Epic #46 — child delivery

| Issue                                                           | Capability              | Primary entry points                                                                      |
| --------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| [#32](https://github.com/The-Allsparks/ftc-dev-tools/issues/32) | Start Here wizard       | **FTC: Start Here**, checklist doc under `.ftc-dev-tools/start-here.md`, Start Here panel |
| [#35](https://github.com/The-Allsparks/ftc-dev-tools/issues/35) | Get/open project        | **FTC: Get or Open FTC Project**                                                          |
| [#36](https://github.com/The-Allsparks/ftc-dev-tools/issues/36) | Sidebar getting started | FTC Robot view → Getting started                                                          |
| [#37](https://github.com/The-Allsparks/ftc-dev-tools/issues/37) | VS Code walkthrough     | Welcome → **Get started with FTC Dev Tools**                                              |
| [#41](https://github.com/The-Allsparks/ftc-dev-tools/issues/41) | USB-first connect       | **FTC: Connect My Robot (USB First)**                                                     |
| [#42](https://github.com/The-Allsparks/ftc-dev-tools/issues/42) | First OpMode path       | **FTC: First OpMode Journey**, [first-opmode-journey.md](first-opmode-journey.md)         |
| [#40](https://github.com/The-Allsparks/ftc-dev-tools/issues/40) | “Am I done?” checklist  | FTC Robot view → **Competition readiness**                                                |

**Epic acceptance (extension-first, no Android Studio required):** A student with a team repo can follow Start Here (or the walkthrough), install prerequisites with explicit consent, open the project, connect USB, create/deploy an OpMode, and stream TeamCode logs — without cloning the `ftc-dev-tools` development repository.

## Meta #45 — 0.1 setup gap verification

Original gaps from closed #13 / #14 follow-ups:

| Gap                                     | Status | Evidence                                                                                                                                                                     |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Re-check loop after installs            | Met    | **FTC: Run Environment Check** after setup; Start Here **Prepare this computer**; doctor UI **success next step**; install-deps completion can offer Start Here machine step |
| VSIX-only install paths (no repo clone) | Met    | [install-without-android-studio.md](install-without-android-studio.md), **FTC: Set Up This Computer** copy actions, **FTC: Run Trusted Install-Deps Installer**              |
| Actionable readiness report             | Met    | Doctor quick pick + fix actions ([doctor.md](doctor.md)), friendly errors                                                                                                    |
| Real Gradle tasks (not placeholders)    | Met    | **FTC: Set Up This FTC Project** writes `ftc-dev-tools` task definitions; see #39                                                                                            |
| No silent system installs               | Met    | Install-deps consent modal + logged command (#34)                                                                                                                            |

Related closed issues: #30, #31, #33, #34, #38, #39, #43, #44.

## Mentor smoke test (~30 min, hardware optional for CI)

Automated CI covers commands and docs links; use this checklist once per release on a clean machine with a VSIX + GitHub CLI tarball (no dev repo clone):

1. Install extension from VSIX and `ftc` CLI from [cli-install.md](cli-install.md).
2. Open team `FtcRobotController` (or equivalent) folder.
3. Run walkthrough or **FTC: Start Here** through **Prepare this computer** — approve install-deps only if needed.
4. **FTC: Run Environment Check** → ready or actionable fixes only.
5. **FTC: Get or Open FTC Project** / **Set Up This FTC Project** if not already configured.
6. **FTC: Connect My Robot (USB First)** with authorized device.
7. **FTC: First OpMode Journey** or build + deploy manually.
8. **FTC: View Robot Logs** (`--teamcode` equivalent).
9. Confirm **Competition readiness** milestones update in the sidebar.

## Explicitly deferred (documented, not blocking 0.2)

| Topic                            | Tracking                                                                |
| -------------------------------- | ----------------------------------------------------------------------- |
| Marketplace / Open VSX publisher | [#9](https://github.com/The-Allsparks/ftc-dev-tools/issues/9)           |
| Full Control Hub hardware matrix | [physical-device-testing.md](physical-device-testing.md), 1.0 milestone |
| Breakpoint debugging on robot    | [debugger-spike.md](debugger-spike.md)                                  |

## Parity audit

See [parity-audit.md](parity-audit.md) — **New-student onboarding** row updated to reflect guided 0.2 delivery.
