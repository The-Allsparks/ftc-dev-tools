# Vision sessions and replay

FTC Dev Tools validates a **versioned session schema** for future replay tooling. **Live capture and playback are not shipped** in 0.1.0.

Technical detail: [architecture/replay-session.md](./architecture/replay-session.md)

## What works today

```bash
ftc replay status --json
```

MCP: `replay_status`, `replay_validate_header`, `replay_validate_event`, `replay_create_header`

Vision Lab panel shows a **deferred replay** section — no record button yet.

## Session file shape

1. **Header** — JSON object with `schemaVersion`, `sessionId`, `startedAt`, `sources[]`
2. **Events** — JSONL file; one event per line with `kind`, `sourceId`, `payload`

Sample files: [samples/vision-session](./samples/vision-session/README.md)

## Validate a header offline

```bash
# Using MCP replay_validate_header with your JSON object, or shared tests in CI
```

Oversized event payloads and unsupported schema versions are **rejected** (see `vision-validation.test.ts`).

## Deferred CLI shortcuts

Cataloged but not implemented:

- `ftc vision sessions record`
- `ftc vision sessions replay`
- `ftc vision sessions export`

Use `ftc vision catalog --json` for the full deferred list.

## Privacy

When capture ships, follow [Vision security](./vision-security.md) before sharing session bundles.
