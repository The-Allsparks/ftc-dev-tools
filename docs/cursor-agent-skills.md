# Cursor agent skills

Cursor reads `SKILL.md` files under `.cursor/skills/` in this repository. They teach the agent how to drive FTC Dev Tools MCP against a connected Control Hub.

| Skill                | Path                                 | When to use                                                                                  |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `ftc-build-deploy`   | `.cursor/skills/ftc-build-deploy/`   | Build TeamCode and install it on the Hub (`doctor` → `devices` → dry-run `deploy` → confirm) |
| `ftc-crash-diagnose` | `.cursor/skills/ftc-crash-diagnose/` | Pull RC / match / logcat / config files and identify why an OpMode or the RC app crashed     |

These skills assume the [MCP server](./mcp.md) is configured with `FTC_PROJECT_ROOT` pointing at the FTC Android project (`settings.gradle` + `TeamCode`).

They do **not** replace the CLI or extension. Mutations still require MCP `dryRun` then `yes` (and an explicit device serial when more than one Android device is connected).
