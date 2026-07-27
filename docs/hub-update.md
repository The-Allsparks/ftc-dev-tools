# Control Hub OS update helpers

FTC Dev Tools Phase 4 provides **explicit** Control Hub Operating System helpers. It does **not** replace the [REV Hardware Client](https://docs.revrobotics.com/rev-hardware-client), and it never flashes firmware in the background.

## What we automate

| Step     | Command                         | Behavior                                                                                        |
| -------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Status   | `ftc hub status`                | Device serial/connection, OS/RC versions when readable (adb + RC Console), console reachability |
| Check    | `ftc hub update check`          | Compare local OS to the published REV changelog catalog                                         |
| Download | `ftc hub update download --yes` | Download allowlisted OS zip into a machine-local cache                                          |
| Apply    | `ftc hub update apply --yes`    | Guided Manage-page flow by default (opens console + prints zip path)                            |

## Commands

```bash
ftc hub status [--device SERIAL] [--json]
ftc hub update check [--local-version 1.1.4] [--fail-if-behind] [--json]
ftc hub update download [--version 1.1.6] [--dry-run|--yes]
ftc hub update apply [--file PATH] [--dry-run|--yes]
ftc hub update apply --attempt-upload --yes   # experimental multipart upload
ftc hub update apply --allow-wifi-adb --yes   # required for Wi-Fi adb devices
```

## Allowlist (fail closed)

Downloads must be `https` and from:

- `github.com/REVrobotics/REV-Software-Binaries/releases/download/...`
- GitHub release CDN hosts (`*.githubusercontent.com`)
- `*.revrobotics.com` (metadata / rare mirrors)

Catalog metadata is read from the official REV OS changelog page.

## Recommended workflow

1. Prefer **USB-C data** cable to the Control Hub (Wi-Fi adb blocked unless `--allow-wifi-adb`).
2. Keep **12V robot power** connected for the whole update (~5 minutes).
3. Check and download:

```bash
ftc hub update check
ftc hub update download --yes
```

4. Apply (guided):

```bash
ftc hub update apply --dry-run
ftc hub update apply --yes
```

5. On the Manage page: **Select Update File** → choose the cached zip (**do not unzip**) → **Update & Reboot**.

## Cache location

| Platform    | Path                                   |
| ----------- | -------------------------------------- |
| Windows     | `%APPDATA%/ftc-dev-tools/hub-updates/` |
| macOS/Linux | `~/.cache/ftc-dev-tools/hub-updates/`  |

## Hard lines

- No automatic / background OS or firmware flash
- No factory reset command in Phase 4
- No silent apply; `--yes` / modal confirmation required
- Expansion Hub board firmware updates: use **REV Hardware Client** (not automated here)

## Extension

- **FTC: Control Hub Status**
- **FTC: Check Control Hub OS Update**
- **FTC: Download Control Hub OS**
- **FTC: Apply Control Hub OS Update** (guided, with confirmations)

## When to use REV Hardware Client instead

- Offline installer bundles
- Expansion Hub / Driver Hub firmware
- One-click multi-component updates REV documents as preferred on Windows
