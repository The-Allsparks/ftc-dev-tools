# Sample vision session (schema only)

Example **session header** and **one event line** for replay schema validation. Live capture is not shipped — use these to understand the format or test MCP `replay_validate_*` tools.

## Files

| File                  | Purpose                 |
| --------------------- | ----------------------- |
| `session-header.json` | Valid header object     |
| `events.jsonl`        | Single JSONL event line |

## Validate

Use MCP tools `replay_validate_header` and `replay_validate_event` with the JSON contents, or run shared package tests (`replay-session.test.ts`).

## Privacy

Do not commit real match recordings with identifiable students to public repositories.
