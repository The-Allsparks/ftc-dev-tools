# Vision MCP agent tools (VISION-16)

Agent-friendly MCP tool names for Vision Lab inspection and carefully gated mutations. Legacy `vision_*` tools from earlier milestones remain registered for backward compatibility.

## Agent tool catalog

| Tool                       | Kind                | Notes                                               |
| -------------------------- | ------------------- | --------------------------------------------------- |
| `vision_list_devices`      | read-only           | Endpoint discovery; use ids for mutations           |
| `vision_get_status`        | read-only           | Config + workspace signals                          |
| `vision_get_diagnostics`   | read-only           | VISION-14 diagnostics                               |
| `vision_list_pipelines`    | read-only           | Workspace Limelight artifacts                       |
| `vision_validate_pipeline` | read-only           | JSON validation                                     |
| `vision_compare_pipeline`  | read-only           | Requires `slot` + `endpointId` or `host`            |
| `vision_list_sessions`     | deferred            | Use `replay_status` for schema foundation           |
| `vision_inspect_session`   | deferred            | Offline replay                                      |
| `vision_analyze_recording` | deferred            | Replay epic                                         |
| `vision_generate_code`     | mutating            | Confirmation gate; Java only                        |
| `vision_capture_frame`     | mutating (deferred) | Requires `endpointId` + confirmation                |
| `vision_upload_pipeline`   | mutating (deferred) | Requires `endpointId`, `artifactPath`, confirmation |
| `vision_activate_pipeline` | mutating (deferred) | Requires `endpointId`, `slot`, confirmation         |
| `vision_upload_python`     | mutating (deferred) | Requires `endpointId`, `artifactPath`, confirmation |
| `vision_upload_fieldmap`   | mutating (deferred) | Requires `endpointId`, `artifactPath`, confirmation |

Total MCP tools after VISION-16: **58** (43 legacy + 15 agent tools).

## Safe agent use

1. **Inspect first** — call `vision_list_devices`, `vision_get_diagnostics`, or `vision_get_status` before suggesting hardware changes.
2. **Never auto-select** — pass explicit `endpointId` from device discovery; mutating tools reject vague targets.
3. **Confirm mutations** — use `dryRun: true`, then `confirmPlanId` + `confirmPlanHash` from the preview response. `yes: true` alone is not accepted.
4. **Redact when sharing** — pass `redact: true` on read-only tools to mask IPs and adb serials.
5. **No credentials** — responses strip password-like fields; do not request Wi‑Fi passwords through MCP.
6. **No huge images** — frame capture (when implemented) will return file references, not base64 blobs.

## Module layout

```
packages/shared/src/vision/mcp/
  catalog.ts    # Tool descriptors
  deferred.ts   # Deferred results + mutation target checks
  sanitize.ts   # Payload limits and endpoint resolution
packages/mcp/src/
  vision-agent-tools.ts          # Tool handlers
  register-vision-agent-tools.ts # Server registration
```

## Related

- [Vision CLI](./vision-cli.md)
- [Vision diagnostics](./vision-diagnostics.md)
- Issue [#64](https://github.com/The-Allsparks/ftc-dev-tools/issues/64)
