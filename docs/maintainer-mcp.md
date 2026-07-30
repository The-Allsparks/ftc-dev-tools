# Maintainer MCP (optional)

**Maintainer-only** stdio MCP for triaging the `The-Allsparks/ftc-dev-tools` GitHub repo in Cursor. Not part of the default student/team setup — see [mcp.md](mcp.md) for the product MCP.

Package: `@ftc-dev-tools/maintainer-mcp` (`ftc-maintainer-mcp`)

## Why a separate server?

Product `@ftc-dev-tools/mcp` is kept lean so Cursor does not load maintainer tool schemas for every FTC team session.

## Build from this repo

```bash
npm install
npm run build --workspace @ftc-dev-tools/maintainer-mcp
```

Entry point:

```bash
node packages/maintainer-mcp/dist/bin.js
```

## Auth

Set one of:

- `GITHUB_TOKEN` or `GH_TOKEN` — PAT with `repo` (issues + Actions read; issue write for comments/create)
- Or link via `ftc github link` (reuses encrypted error-report token)
- Windows launcher also tries `gh auth token`

Optional:

- `GITHUB_REPO` — default `The-Allsparks/ftc-dev-tools`
- `MAINTAINER_REPO_ROOT` — repo root for local `scripts/issue-label-catalog.json` (set automatically by `scripts/ftc-maintainer-mcp.ps1`)

## Cursor MCP config (maintainers)

Uses `scripts/ftc-maintainer-mcp.ps1` on Windows so `gh auth token` and `MAINTAINER_REPO_ROOT` are set automatically.

```json
{
  "mcpServers": {
    "ftc-maintainer": {
      "command": "powershell",
      "args": [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "C:/path/to/ftc-dev-tools/scripts/ftc-maintainer-mcp.ps1"
      ]
    }
  }
}
```

Or run `node packages/maintainer-mcp/dist/bin.js` directly with `GITHUB_TOKEN` / `GH_TOKEN` set.

## Tools

| Tool                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `issues_open_summary`  | Open issue backlog summary (optional label filter, grouping)                  |
| `issues_search`        | Free-text issue search (`VISION`, `Orchestrator`, etc.)                       |
| `issue_show`           | Single issue + parsed acceptance criteria                                     |
| `issue_label_check`    | Validate labels vs `issue-label-catalog.json`                                 |
| `prs_merged_since`     | Merged PRs in a time window with `Fixes #` refs                               |
| `open_prs_summary`     | Open PRs (draft, labels, closing refs)                                        |
| `issue_pr_alignment`   | Cross-reference issues with PRs (`Fixes #`, `#N`, codenames like `VISION-06`) |
| `ci_failure_summary`   | Failed Actions run with bounded log excerpt                                   |
| `issue_comment`        | Preview or post comment (`yes=true` required to post)                         |
| `issue_create_preview` | Preview/create issue with catalog-suggested labels                            |
| `release_diff`         | Commits on `main` since latest release tag                                    |

## Safety

- Read tools need no confirmation
- `issue_comment` and `issue_create_preview` preview by default; set `yes=true` to post/create
- Responses are bounded JSON; logs and bodies are truncated/redacted

## Related

- [#166 — Add optional maintainer MCP package](https://github.com/The-Allsparks/ftc-dev-tools/issues/166)
- [#165 — Product agent MCP tools](https://github.com/The-Allsparks/ftc-dev-tools/issues/165)
- [issue-labels.md](issue-labels.md)
