# MCP server

Thin **stdio MCP** surface over `@ftc-dev-tools/shared` for Cursor (and other MCP hosts). It does **not** replace the CLI or VS Code/Cursor extension.

Package: `@ftc-dev-tools/mcp` (`ftc-mcp`)

## Consumer install

When `@ftc-dev-tools/mcp` is on npm:

```bash
npm install -g @ftc-dev-tools/mcp
ftc-mcp
```

Or without a global install:

```bash
npx -y @ftc-dev-tools/mcp
```

npm auto-publish is disabled until maintainers configure `NPM_TOKEN`. Until then, use **build from this repo** (below) or watch [cli-install.md](cli-install.md) for release-based options aligned with the CLI.

## Install / run from this repo

```bash
npm install
npm run build --workspace @ftc-dev-tools/mcp
```

Entry point after build:

```bash
node packages/mcp/dist/bin.js
```

Or via the package bin:

```bash
npx ftc-mcp
```

## Cursor MCP config

Add a local stdio server (paths absolute on your machine):

```json
{
  "mcpServers": {
    "ftc-dev-tools": {
      "command": "node",
      "args": ["C:/path/to/ftc-dev-tools/packages/mcp/dist/bin.js"],
      "env": {
        "FTC_PROJECT_ROOT": "C:/path/to/your/FtcRobotController"
      }
    }
  }
}
```

Most tools accept an optional `projectRoot` argument. If omitted, the server uses `FTC_PROJECT_ROOT`, then the process cwd.

**Do not** redirect application logs to stdout — MCP uses stdout for JSON-RPC. Shared logging already goes to stderr.

## Tools

### Read-only

| Tool     | Mirrors             |
| -------- | ------------------- |
| `doctor` | `ftc doctor --json` |

Doctor JSON includes `sections` (machine / project / robot / optional) — see [doctor.md](doctor.md).
| `devices` | `ftc devices --json` |
| `sdk_check` | `ftc sdk check --json` |
| `wifi_status` | `ftc wifi status --json` |
| `hub_status` | `ftc hub status --json` |
| `hub_update_check` | `ftc hub update check --json` |
| `pedro_status` | `ftc pedro status --json` |
| `opmode_list` | `ftc opmode list --json` |
| `config_list` / `config_show` / `config_validate` | `ftc config …` |
| `hwmap_show` | `ftc hwmap show --json` |

### Confirmed mutations

These refuse unless `yes=true` (or `dryRun=true` when supported):

| Tool                           | Notes                                       |
| ------------------------------ | ------------------------------------------- |
| `build`                        | Requires `yes=true`                         |
| `deploy`                       | `yes` or `dryRun`; optional `device` serial |
| `sdk_update`                   | Never touches `TeamCode/`                   |
| `pedro_add` / `pedro_scaffold` | Same guards as CLI                          |
| `opmode_create`                | TeleOp / Autonomous stubs                   |
| `config_pull`                  | adb pull only; never activates hub config   |
| `hwmap_codegen`                | New OpMode with `hardwareMap.get` stubs     |

Wi-Fi manage/set, hub OS download/apply, and live Logcat streaming are **not** exposed in this MVP (use CLI/extension).

## Safety

- Same shared invariants as CLI: no silent multi-device selection, no automatic firmware flash, no TeamCode wipe on SDK update
- Mutations require explicit `yes` (agent confirmation) or `dryRun`
- Results are structured JSON in the tool `content` text payload

## Related

- [Architecture](architecture.md)
- [CLI / extension roadmap](../README.md#roadmap-not-all-shipped)
