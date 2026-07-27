# Branding and publishing

This document records the intentional relationship among product names, package identities, and publish targets. Names do **not** need to be identical; they must stay consistent and documented.

## Identity map

| Concept                | Value                          | Notes                                                         |
| ---------------------- | ------------------------------ | ------------------------------------------------------------- |
| GitHub organization    | `The-Allsparks`                | Owns the public source repository                             |
| Repository             | `The-Allsparks/ftc-dev-tools`  | Canonical clone URL                                           |
| Public product name    | **FTC Dev Tools**              | Used in README, Marketplace display name, UI                  |
| npm scope              | `@ftc-dev-tools`               | Shared/CLI/MCP packages; do not rename casually               |
| Extension package name | `ftc-dev-tools`                | Marketplace extension `name` (not the publisher)              |
| Extension publisher ID | `ftc-dev-tools`                | Marketplace **publisher** field; may differ from display name |
| CLI executable         | `ftc`                          | Installed binary from `@ftc-dev-tools/cli`                    |
| MCP executable         | `ftc-mcp`                      | From `@ftc-dev-tools/mcp`                                     |
| Team homepage          | `https://www.theallsparks.org` | Linked from package metadata                                  |

Do **not** invent a `ftc-dev-tools` GitHub organization URL. The product brand and npm scope intentionally differ from the GitHub org.

## Publisher ID vs display name

- **Display name** (`displayName`): human-readable title shown in the Marketplace UI — `FTC Dev Tools`.
- **Publisher ID** (`publisher`): the Marketplace account slug, e.g. `ftc-dev-tools`. It must match an account you control.
- Full extension identity is `publisher.name` (for example `ftc-dev-tools.ftc-dev-tools`).

### How to create or select a Marketplace publisher

1. Sign in to the [Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage) portal with the Microsoft account that should own releases.
2. Create a publisher **or** select an existing one. Record the exact publisher ID.
3. Confirm the publisher ID matches `packages/vscode-extension/package.json` → `"publisher"`.
4. Verify ownership by listing your publishers in the management UI (or `npx @vscode/vsce ls-publishers` when authenticated).

Until ownership of `ftc-dev-tools` is confirmed, treat Marketplace publishing as blocked. Do not enable automatic publishing in CI.

### Where the publisher value must be updated

- [`packages/vscode-extension/package.json`](../packages/vscode-extension/package.json) — `"publisher"`
- Release docs / this file if the chosen ID changes
- Any Marketplace badges or install links (when added)

Changing the publisher after a public release creates a **new** Marketplace extension identity; prefer verifying ownership before the first publish.

## Microsoft Marketplace vs Open VSX

| Topic                     | Visual Studio Marketplace                              | Open VSX                                             |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Typical hosts             | VS Code, Cursor (depending on config)                  | VSCodium, some Linux distributions, Open VSX clients |
| Auth                      | Personal Access Token / Azure DevOps for the publisher | Open VSX namespace token                             |
| Tooling                   | `@vscode/vsce` (`vsce publish`)                        | `ovsx publish`                                       |
| Secrets (eventual)        | `VSCE_PAT` or equivalent                               | `OVSX_PAT` or equivalent                             |
| Auto-publish in this repo | **Disabled**                                           | **Disabled**                                         |

Publish to both only after publisher/namespace ownership is confirmed and a human release checklist is followed. GitHub Releases (VSIX + CLI archives) remain the supported distribution path for `0.1.0`.

## Release secrets (eventually required)

When automated or manual remote publish is enabled:

- GitHub Release: existing `GITHUB_TOKEN` in Actions is enough for attaching artifacts
- Marketplace: publisher Personal Access Token with Marketplace publish scope
- Open VSX: namespace access token
- npm (if CLI is ever published): npm automation token for `@ftc-dev-tools`

Do not commit tokens. Do not add publish steps until ownership is verified.

## Validation

```bash
npm run check:identity
npm run release:check
```

`release:check` validates versions, repository URLs, publisher format, icon/metadata, licenses, README links, changelog entry, and (by default) builds CLI + VSIX packages. Use `--allow-dirty` while iterating and `--skip-package` for a fast metadata-only pass.

## Related docs

- [Releasing](releasing.md)
- [Feature maturity](feature-maturity.md)
- [SUPPORT.md](../SUPPORT.md) — donations do not purchase publish rights or roadmap control
