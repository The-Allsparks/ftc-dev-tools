# Integration expectations

Lightweight contract for proposing and reviewing **external-tool integrations** in FTC Dev Tools. This is documentation only — no plugin runtime or marketplace.

For adapter behavior requirements, see [ADR-0010](./adr/0010-adapter-requirements-contract.md). For product principles, see [product-philosophy](./product-philosophy.md).

## When this applies

Use this checklist when adding or substantially changing integrations such as pathing libraries, telemetry dashboards, vision stacks, hub utilities, or codegen templates that wrap upstream projects.

Core build/deploy (`adb`, Gradle Wrapper) and the FTC SDK itself follow the same safety principles but are documented in [architecture.md](../architecture.md).

## Integration proposal template

Copy into an issue or design note and fill in each section.

### 1. Authoritative upstream tool

- **Name and home URL:**
- **License:**
- **Who maintains it:** (vendor, community, team)
- **Why wrap instead of rewrite:**

### 2. Installation and version detection

- **How students install it today** (Gradle dependency, vendor installer, browser-only, …)
- **How FTC Dev Tools detects presence** (files, Gradle coordinates, network probe)
- **Supported versions** (minimum, tested, known broken)
- **Detection is read-only:** yes / no

### 3. Capabilities exposed

List manifest `capabilities` and which adapter operations implement them:

| Capability     | Read-only | Mutating | Notes            |
| -------------- | --------- | -------- | ---------------- |
| e.g. `detect`  | ✓         |          |                  |
| e.g. `install` |           | ✓        | requires `--yes` |

Map to student goals ([product-philosophy](./product-philosophy.md)), not to internal module names.

### 4. Read-only vs mutating operations

| Operation | Mutates project | Mutates device/network | Requires `--yes` / UI confirm |
| --------- | --------------- | ---------------------- | ----------------------------- |
|           |                 |                        |                               |

Mutating operations must support dry-run or preview where files or Gradle settings change.

### 5. Configuration changes

- Files added or modified (paths, idempotent or not)
- Gradle / settings changes
- `.ftc-dev.json` keys (if any)
- What happens on re-run when already configured

### 6. Launch or invocation mechanism

- CLI subcommand(s)
- MCP tool(s)
- Extension command(s)
- External process spawned (command template students can inspect)
- Timeouts and cancellation behavior

### 7. Structured output or evidence

- JSON envelope shape (if any)
- Log lines parsed for diagnostics
- Network responses cached or redacted
- What is **observation** vs **hypothesis** for replay ([ADR-0008](./adr/0008-replay-observations-vs-hypotheses.md))

### 8. Error and timeout handling

- Typical failure modes and friendly error codes
- When to fail closed vs degrade gracefully
- Network unreachable, wrong SDK version, missing dependency

### 9. Uninstall or rollback behavior

- How students remove the integration safely
- Whether FTC Dev Tools offers an uninstall command or documents manual steps
- Backup strategy for overwritten TeamCode files

### 10. Security and trust requirements

- Network endpoints contacted (LAN-only vs internet)
- Credentials stored (must not land in repo)
- Redaction in logs and `--json` output
- Agent mutation gates for MCP

See [vision-security.md](../vision-security.md) for vision-specific patterns.

### 11. Hardware validation requirements

- Mock-tested scenarios (CI)
- Desktop-tested scenarios
- Control Hub / Driver Hub checklist items
- Maturity label target ([feature-maturity.md](../feature-maturity.md))

### 12. Ownership boundary

| Concern              | Upstream tool owns    | FTC Dev Tools owns               |
| -------------------- | --------------------- | -------------------------------- |
| e.g. pipeline tuning | Limelight web UI      | discover, open, validate JSON    |
| e.g. path following  | Pedro library runtime | detect, add dependency, scaffold |

FTC Dev Tools must not fork upstream source without maintainer approval and documented patches.

## Reference: Pedro Pathing (implemented)

| Section      | Current approach                                                        |
| ------------ | ----------------------------------------------------------------------- |
| Upstream     | Pedro Pathing library (Maven)                                           |
| Detection    | Gradle dependency and package scan via adapter                          |
| Capabilities | detect, install (add), scaffold (codegen)                               |
| Mutations    | `--yes` for add/scaffold; dry-run supported                             |
| Surfaces     | `ftc pedro *`, MCP pedro tools, extension commands                      |
| Ownership    | Pedro owns motion algorithms; FTC Dev Tools owns Gradle/scaffold wiring |

## Reference: Limelight (implemented)

| Section      | Current approach                                                                          |
| ------------ | ----------------------------------------------------------------------------------------- |
| Upstream     | Limelight camera web UI and JSON API                                                      |
| Detection    | Network probe, pipeline file scan                                                         |
| Capabilities | status, results, pipeline list/validate (read-heavy); pipeline activation gated           |
| Mutations    | Pipeline changes require explicit confirmation; no silent robot movement                  |
| Ownership    | Limelight owns tuning UI; FTC Dev Tools owns discovery, diagnostics, student entry points |

## Review gates

Maintainers should reject integrations that:

- Silently mutate robots, networks, or source
- Duplicate upstream UIs without clear student value
- Lack a documented uninstall or rollback path for project changes
- Claim hardware validation without checklist evidence
- Introduce platform-wide conditionals instead of adapter registration

## Related documents

- [ADR-0003 Integration registry](./adr/0003-integration-registry.md)
- [ADR-0010 Adapter requirements contract](./adr/0010-adapter-requirements-contract.md)
- [Software ecosystem](./ftc-software-ecosystem.md)
- [Library capability matrix](./library-capability-matrix.md)
