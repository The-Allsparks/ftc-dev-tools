# Pedro Pathing

FTC Dev Tools Phase 5 adds first-class **Pedro Pathing** helpers for official FTC projects. It does **not** install Road Runner.

## Commands

```bash
ftc pedro status [--json]
ftc pedro add [--version X] [--dry-run|--yes] [--force]
ftc pedro scaffold [--tag vX.Y.Z] [--dry-run|--yes] [--force]
```

## Typical workflow

1. Open an official FtcRobotController-based project (with `TeamCode/`).
2. Add Maven repo + dependencies:

```bash
ftc pedro add --dry-run
ftc pedro add --yes
```

3. Sync Gradle in Android Studio / your IDE.
4. Scaffold the Quickstart `pedroPathing` package into TeamCode:

```bash
ftc pedro scaffold --dry-run
ftc pedro scaffold --yes
```

5. Tune per [pedropathing.com](https://pedropathing.com/docs/pathing) (localization, constants, etc.).

## What `add` changes

- Ensures `maven { url = 'https://mymaven.bylazar.com/releases' }` in `build.dependencies.gradle`
- Adds/updates:
  - `com.pedropathing:ftc` (latest stable from Maven Central metadata, or `--version`)
  - `com.pedropathing:telemetry:1.0.0`
  - `com.bylazar:fullpanels:1.0.12`
- Optionally bumps `compileSdk` to **34** in known gradle files (`build.common.gradle`, module `build.gradle`) when below 34 (`--no-patch-compile-sdk` to skip)

Backups land under `.ftc-dev-tools/backups/pedro-add-<timestamp>/`.

## What `scaffold` copies

Only paths matching:

```text
TeamCode/**/pedroPathing/**
```

from the [Pedro-Pathing/Quickstart](https://github.com/Pedro-Pathing/Quickstart) release zipball.

- Unrelated TeamCode files are **never** copied or overwritten
- Dirty git trees are refused unless `--force`
- Backups of overwritten pedroPathing files go under `.ftc-dev-tools/backups/pedro-scaffold-<timestamp>/`

## Extension

- **FTC: Pedro Pathing Status**
- **FTC: Add Pedro Pathing**
- **FTC: Scaffold Pedro Pathing**

## Safety

- Explicit `--yes` / modal confirmation
- Dry-run supported
- Dirty-tree guard (same pattern as SDK update)
- No automatic tuning or Road Runner install
