# Telemetry spike

**Status:** research / design guidance. No proprietary live dashboard ships in 0.1.0.

## Context

Android Studio does not provide an FTC-specific telemetry IDE panel. The community [FTC for VS Code](https://marketplace.visualstudio.com/items?itemName=Juice16236.ftc-for-vs-code) extension lists an integrated robot dashboard as **Planned**, not implemented. FTC Dev Tools should not implement a dashboard merely to match an unimplemented promise.

## Existing mechanisms

| Mechanism                                                      | Notes                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Driver Station telemetry                                       | Official; competition-legal; limited bandwidth                                     |
| Logcat                                                         | Already integrated via `ftc logs` / extension                                      |
| [FTC Dashboard](https://acmerobotics.github.io/ftc-dashboard/) | Common community tool; HTTP/WebSocket; may conflict with competition network rules |
| RC web console                                                 | Already linked via Wi-Fi helpers                                                   |
| Custom sockets                                                 | Team-specific; avoid inventing a new ecosystem                                     |

## Recommendation

Prefer **interoperability** with existing tools:

1. Detect whether FTC Dashboard (or similar) is present on the robot network / project dependencies.
2. Offer **Open FTC Dashboard** only when a URL is known/configured.
3. Prefer recording/export of telemetry or Logcat for offline inspection over a new protocol.
4. Never assume competition Wi-Fi allows arbitrary sockets.

Do **not** create an incompatible proprietary telemetry ecosystem without a compelling reason documented here.

## Candidate commands (future, optional)

- `FTC: Open FTC Dashboard` — only when installed/detected
- `FTC: Record Telemetry Session` / `FTC: Open Recorded Telemetry` — only with a clear storage format and privacy review

## Acceptance criteria for any telemetry feature

- No incompatible proprietary protocol without a written justification
- No competition-illegal network assumptions
- Recorded telemetry inspectable offline
- Dashboard support remains optional
- Maturity labeled honestly ([feature-maturity.md](feature-maturity.md))
