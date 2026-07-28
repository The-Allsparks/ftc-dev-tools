# Install the `ftc` CLI (consumers)

This guide is for **students, coaches, and mentors** who want the `ftc` command without cloning the FTC Dev Tools development repository.

The VS Code/Cursor **extension** (VSIX) and the **`ftc` CLI** are separate installs. Extension commands call `ftc` in a terminal; if you see “command not found”, install the CLI using one of the paths below.

## Prerequisites

- **Node.js 20+** ([nodejs.org](https://nodejs.org/))
- JDK and `adb` for your FTC season — see [getting-started.md](getting-started.md) and [install-without-android-studio.md](install-without-android-studio.md)

## Recommended: GitHub Release (0.1.0)

After maintainers publish a [GitHub Release](https://github.com/The-Allsparks/ftc-dev-tools/releases) (tag like `v0.1.0`), install globally in one step:

```bash
npm install -g "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz"
```

Replace `0.1.0` with the version shown on the release page. This needs **network access only** — no `git clone` and no `npm link`.

Verify:

```bash
ftc --help
ftc doctor
```

Run `ftc doctor` from your FTC Android project folder (the one with `gradlew`).

### Checksum

Each release attaches `ftc-cli-<version>.tar.gz.sha256`. Verify before install if your team policy requires it.

## When npm publish is enabled (future)

Once `@ftc-dev-tools/cli` is on the public npm registry:

```bash
npm install -g @ftc-dev-tools/cli
```

npm publishing is **not** automated in this repository until a maintainer configures `NPM_TOKEN`. Until then, use the GitHub Release tarball above.

## MCP server (`ftc-mcp`)

The MCP package is `@ftc-dev-tools/mcp`. Consumer install options:

**After npm publish:**

```bash
npm install -g @ftc-dev-tools/mcp
```

**Without a global install (after npm publish):**

```bash
npx -y @ftc-dev-tools/mcp
```

Until MCP is published, build from source — see [mcp.md](mcp.md).

## Extension: Install FTC CLI

In VS Code or Cursor, run **FTC: Install FTC CLI** from the Command Palette. It previews install commands and lets you **copy** the command or **open a terminal** — it does not run a silent global install.

## From source (contributors)

Maintainers and contributors who work on FTC Dev Tools itself should clone the repo and link workspaces. See the root [README.md](../README.md#from-source-contributors).

## Troubleshooting

| Symptom | What to try |
| -------- | ------------ |
| `ftc: command not found` | Ensure Node global bin is on your `PATH` (restart the terminal after `npm install -g`). |
| `Cannot find module '@ftc-dev-tools/shared'` | Re-install from a current release tarball (older archives may not bundle shared). |
| No release yet | Wait for tag `v*` on GitHub or use [from source](../README.md#from-source-contributors) until the first release ships. |
