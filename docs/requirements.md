# Product requirements

Formal requirements for FTC Dev Tools. Use these IDs in issues, ADRs, and release planning. Status values: **Required** (committed direction), **Planned** (scoped, not started), **In progress**, **Shipped**, **Deferred**.

See also [feature maturity](./feature-maturity.md), [parity audit](./parity-audit.md), and the [README roadmap](../README.md#roadmap).

---

## Onboarding and project creation

### REQ-PROJ-001 — Create an FTC project from scratch

| Field             | Value                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **Required**                                                                                                         |
| **Priority**      | P0                                                                                                                   |
| **Surfaces**      | `shared-core`, `vscode`, `cli`                                                                                       |
| **Related today** | **FTC: Get or Open FTC Project** (open / clone only); **FTC: Set Up This FTC Project** (VS Code tasks/settings only) |

**Problem:** A team with no existing Android Studio project, no team Git repo, and no prior SDK checkout cannot complete rookie onboarding inside the IDE. **Obtain** assumes something already exists on disk or on GitHub. **Set Up** assumes an official Gradle layout is already present.

**Requirement:** Provide a guided path that materializes a **buildable official FTC project layout** (Gradle wrapper, `FtcRobotController` + `TeamCode`, SDK wiring) in a chosen or current folder — without requiring Android Studio or manual SDK hunting.

**Minimum acceptance criteria:**

1. Student can pick an empty folder (or the current workspace) and end with a project that passes **FTC: Run Environment Check** project detection.
2. First build (`ftc build` / **FTC: Build Robot Code**) succeeds on a maintainer-validated matrix after prerequisites are installed.
3. Flow chains into **Set Up This FTC Project** and **FTC: First OpMode Journey** without manual Gradle editing.
4. Dry-run / preview before writing files; backups when overwriting an non-empty folder.
5. Documented alternative: clone official SDK (keep existing obtain paths).

**Implementation notes (non-binding):**

- Extend **FTC: Get or Open FTC Project** with **Create new FTC project here** (or equivalent).
- Reuse detection rules from `OfficialFtcProjectAdapter` and the shape in [`examples/sample-ftc-project`](../examples/sample-ftc-project/) as a scaffold baseline; a full solution must include a real SDK source (clone, submodule, or documented download step).
- CLI parity: `ftc project create` (name TBD) with `--dry-run` / `--yes`.

**Out of scope for v1 of this requirement:** Kotlin-first templates, custom package naming beyond SDK defaults, monorepo layouts.

---

## Interactive debugging

### REQ-DBG-001 — Java breakpoint attach on Robot Controller

| Field             | Value                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Status**        | **Required**                                                                              |
| **Priority**      | P0                                                                                        |
| **Surfaces**      | `vscode`, `shared-core`, `cli`                                                            |
| **Related today** | Logcat only (`ftc logs`, **FTC: View Robot Logs**); [debugger spike](./debugger-spike.md) |

**Problem:** Log streaming alone does not deliver the core value of a full agentic IDE: pause, step, inspect variables, and correlate runtime state with `TeamCode` source while the robot is running. Android Studio supports this; FTC Dev Tools must close the gap for extension-first teams.

**Requirement:** Ship reliable **JDWP attach debugging** for FTC `TeamCode` on Robot Controller (Control Hub and phone RC), integrated with VS Code / Cursor Java debugging.

**Minimum acceptance criteria:**

1. Breakpoints in `TeamCode` hit on physical hardware (Control Hub **and** phone RC rows in [feature maturity](./feature-maturity.md)).
2. Source mapping from the Gradle project works without manual path hacks for the standard layout.
3. Commands: attach, build-deploy-and-debug, stop session (names may match [debugger-spike.md](./debugger-spike.md)).
4. Mandatory safety UX: robot secured, no match use, motor/watchdog warnings, recoverable disconnect — documented and acknowledged before attach.
5. USB-first path validated; Wi‑Fi ADB documented as best-effort if supported.
6. If attach is technically blocked on a platform, document the blocker in the spike doc and ship the best non-pausing fallback (logpoints, conditional logging, diagnostic bundles) — **without** downgrading this requirement for platforms where attach is viable.

**Milestone:** **0.4 Debugging Investigation** → delivery target for implementation after hardware spike sign-off.

---

## Competition rules and season handbook

### REQ-RULE-001 — Season handbook and game manual awareness

| Field             | Value                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Status**        | **Required**                                                                                              |
| **Priority**      | P1                                                                                                        |
| **Surfaces**      | `shared-core`, `vscode`, `documentation`                                                                  |
| **Related today** | **Competition readiness** milestones (workflow only); robot config validate (file format, not game rules) |

**Problem:** Teams must comply with the current season's game manual, robot rules, and inspection constraints. Today FTC Dev Tools does not reference, surface, or check any of that content.

**Requirement:** Add **season-aware rule support** so students and mentors can connect robot design and software choices to the official handbook — starting with discovery and advisory checks, not claiming legal/inspection authority.

**Minimum acceptance criteria (phased):**

**Phase A — Awareness**

1. Configurable **current season** (and optional game name) in `.ftc-dev.json` or workspace settings.
2. Links to official FIRST season resources (game manual, inspection checklist, legal/robot rules index) from **Competition readiness** and/or a dedicated **FTC: Season Rules** entry point.
3. Copy makes clear: **advisory tooling, not an inspection substitute**.

**Phase B — Actionable checks (initial set)**

4. Pluggable **rule check** catalog (versioned JSON or shared schema) with human-readable titles, handbook section references, and pass/warn/fail/not-applicable outcomes.
5. At least one shipped check category relevant to software-adjacent rules (e.g. starting configuration reminders, required telemetry/disclosure patterns, or custom game-element size hooks where data is available) — exact checks TBD with mentor input per season.
6. **FTC: Run Season Rule Checks** (CLI: `ftc rules check`) with `--json` for mentors; results appear in doctor-style sectioned output.
7. Optional: agent/MCP tool to fetch rule check summary for a workspace.

**Phase C — Deeper integration (later)**

8. Tie rule status into **Competition readiness** milestones where appropriate.
9. Season update workflow when FIRST publishes a new manual revision.

**Out of scope:** Replacing head referees, guaranteeing inspection pass, or scraping paywalled content without permission.

---

## Requirement index

| ID           | Title                                      | Priority | Status   |
| ------------ | ------------------------------------------ | -------- | -------- |
| REQ-PROJ-001 | Create FTC project from scratch            | P0       | Required | [#159](https://github.com/The-Allsparks/ftc-dev-tools/issues/159) |
| REQ-DBG-001  | Java breakpoint attach on Robot Controller | P0       | Required | [#160](https://github.com/The-Allsparks/ftc-dev-tools/issues/160) |
| REQ-RULE-001 | Season handbook and game manual awareness  | P1       | Required | [#161](https://github.com/The-Allsparks/ftc-dev-tools/issues/161) |

## Traceability

| Requirement  | Parity audit                  | Feature maturity                | Spike / design                                                                                                        |
| ------------ | ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| REQ-PROJ-001 | Gradle project initialization | —                               | `examples/sample-ftc-project`                                                                                         |
| REQ-DBG-001  | Breakpoint debug on RC        | Java debugger attach → Required | [debugger-spike.md](./debugger-spike.md); prior spike [#20](https://github.com/The-Allsparks/ftc-dev-tools/issues/20) |
| REQ-RULE-001 | (new row)                     | —                               | TBD — rule catalog schema                                                                                             |

When filing GitHub issues, reference the requirement ID in the title or body (e.g. `REQ-PROJ-001:`).
