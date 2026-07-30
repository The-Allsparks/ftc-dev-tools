# Vision architecture (overview)

Student- and mentor-facing summary. Maintainer detail lives in [architecture/vision-providers.md](./architecture/vision-providers.md).

## Design

Vision Lab follows the repository **shared-core, thin-UI** model:

- **`@ftc-dev-tools/shared`** — discovery, HTTP clients, diagnostics, validation, codegen templates
- **`ftc` CLI** — scripting and `--json` automation
- **VS Code extension** — Vision Lab panel (read-only foundation)
- **`ftc-mcp`** — agent tools with mutation gates and payload sanitization

Vision providers register in a catalog (`ftc providers list --json`). Each provider links to a frame source (Limelight HTTP, VisionPortal webcam, sim virtual frame, etc.) without importing Sim or Replay code directly.

## Safety rules (always)

1. **Never auto-select** among multiple ADB devices, Limelight hosts, or webcam names.
2. **Mutations require confirmation** — `--yes`, modal approval, or MCP `yes: true`.
3. **Mock-tested ≠ hardware validated** — see `ftc vision validation status`.
4. **No secrets in `.ftc-dev.json`** — hosts and URLs only.

## Shipped milestones (VISION-01–17)

| Area                      | CLI entry points                                      |
| ------------------------- | ----------------------------------------------------- |
| Workspace discovery       | `ftc vision status`, `discover`                       |
| Endpoint discovery        | `ftc vision devices`                                  |
| Limelight HTTP            | `ftc vision limelight status\|results`                |
| Pipeline-as-code          | `ftc vision limelight pipelines list\|validate\|diff` |
| FTC Dashboard             | `ftc vision dashboard status\|open`                   |
| Diagnostic bridge         | `ftc vision bridge status\|scaffold`                  |
| VisionPortal / EasyOpenCV | `ftc vision visionportal\|easyopencv status`          |
| Java codegen              | `ftc vision codegen …`                                |
| Diagnostics               | `ftc vision diagnostics`                              |
| Validation matrix         | `ftc vision validation status`                        |
| Session schema            | `ftc replay status` (capture deferred)                |

## Deferred

- Live frame capture and offline replay playback
- Limelight pipeline upload / activate on camera
- Live video overlay graphs in the panel
- Generated Java compilation tests on robot hardware in CI

## ADRs and epics

- [ADR-0004 Provider-based composition](./architecture/adr/0004-provider-based-composition.md)
- [Vision Lab epic #48](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)
