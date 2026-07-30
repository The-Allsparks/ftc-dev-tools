# Session recording and replay (VISION-13)

Foundation for versioned session manifests, JSONL event streams, and offline replay. This milestone ships **schema validation and capability flags** — live capture, frame storage, and playback controls remain deferred (see [FTC Replay epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)).

## Schemas (v1.0.0)

| Schema         | File                                                | Purpose                                                                           |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Session header | `packages/shared/schemas/session.schema.json`       | Manifest: `sessionId`, `startedAt`, `sources`, optional metadata                  |
| Session event  | `packages/shared/schemas/session-event.schema.json` | JSONL envelope: `sequence`, `timestampMs`, `kind`, `sourceId`, optional `payload` |

Event kinds: `vision.diagnostic`, `vision.results`, `frame.metadata`, `session.note`, `session.marker`.

Wall-clock (`timestampMs`) and optional monotonic (`monotonicMs`) timestamps support future stream replay. Payloads must not contain credentials.

## Shared API

`packages/shared/src/replay/`:

| Export                                               | Purpose                                          |
| ---------------------------------------------------- | ------------------------------------------------ |
| `getReplayStatus()`                                  | Capabilities, limits, registered replay backends |
| `createSessionHeader()`                              | Build a valid header with generated `sessionId`  |
| `validateSessionHeader()` / `validateSessionEvent()` | Ajv validation + version checks                  |
| `parseSessionEventLine()`                            | Validate one JSONL line                          |
| `REPLAY_CAPABILITIES`                                | Feature flags (`liveCapture: false`, etc.)       |
| `REPLAY_SESSION_LIMITS`                              | User-visible bounds for future capture           |

Recommended `.gitignore` entries: `.ftc-sessions/`, `*.ftc-session.jsonl`, `.ftc-dev-tools/sessions/`.

## CLI

```bash
ftc replay status --json
ftc replay create-header --source vision:limelight --source vision:bridge --notes "Practice"
ftc replay validate header session-header.json
ftc replay validate event events.jsonl
```

## MCP

| Tool                     | Notes                              |
| ------------------------ | ---------------------------------- |
| `replay_status`          | Read-only capability report        |
| `replay_validate_header` | Validate header object             |
| `replay_validate_event`  | Validate event envelope            |
| `replay_create_header`   | Build header without writing files |

## Vision Lab panel

The **Live camera & replay** section shows schema versions, capability flags, session limits, replay backends, and `.gitignore` hints. Record/pause/play controls are deferred until the capture pipeline lands.

## Deferred (VISION-13+ / #143)

- Live frame and annotated frame capture
- Bounded session writer with disk preflight
- Offline replay provider feeding `frame:replay-file`
- Export bundles, redaction, dataset manifests
- Vision Lab transport controls

## Related

- [ADR-0005 Versioned shared schemas](./adr/0005-versioned-shared-schemas.md)
- [VISION-13 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/61)
- [FTC Replay epic](https://github.com/The-Allsparks/ftc-dev-tools/issues/143)
