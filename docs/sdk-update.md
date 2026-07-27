# FTC SDK update

FTC Dev Tools can detect your project's FTC Maven SDK version and sync **SDK-owned** files from an official [FtcRobotController](https://github.com/FIRST-Tech-Challenge/FtcRobotController) GitHub release.

**TeamCode is never modified.**

## Commands

```bash
ftc sdk check
ftc sdk check --json
ftc sdk check --fail-if-behind
ftc sdk check --version v11.2

ftc sdk update --dry-run
ftc sdk update --yes
ftc sdk update --yes --force
ftc sdk update --yes --version v11.2
```

Extension commands:

- **FTC: Check SDK Version**
- **FTC: Update FTC SDK**

`ftc doctor` also includes a non-blocking **FTC SDK version freshness** check (warn if behind; skip if offline).

## How local version is detected

1. Read `build.dependencies.gradle`
2. Parse `org.firstinspires.ftc:*:X.Y.Z` coordinates
3. Prefer `RobotCore` / `FtcCommon` as the reported version
4. Warn if FTC artifact versions disagree with each other
5. Optionally read `FtcRobotController/.../AndroidManifest.xml` `android:versionName` (informational)

## How latest is resolved

GitHub Releases API for `FIRST-Tech-Challenge/FtcRobotController` (latest non-draft, non-prerelease by default). Use `--version <tag>` to pin a release.

## What `ftc sdk update` syncs

From the release archive into your project (when present upstream):

- `FtcRobotController/`
- `build.gradle`, `build.common.gradle`, `build.dependencies.gradle`
- `settings.gradle` or `settings.gradle.kts` (matching your project’s dialect)
- `gradle/` wrapper directory, `gradlew`, `gradlew.bat`

Never touched:

- `TeamCode/`
- `.ftc-dev.json`
- `.git/`
- Team `README.md` (upstream README is not synced)

## Safety rails

| Guard          | Behavior                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| Confirmation   | Real applies require `--yes` (CLI) or a modal confirm (extension)                     |
| Dirty git tree | Refused by default; pass `--force` to proceed                                         |
| Backup         | Before writing, copies overwritten paths to `.ftc-dev-tools/backups/sdk-<timestamp>/` |
| Dry run        | `--dry-run` shows the plan without writing                                            |
| Offline        | `check` fails softly with a friendly network error; doctor marks freshness `skip`     |

## Recommended workflow

1. Commit or stash TeamCode and any intentional SDK edits.
2. `ftc sdk check`
3. `ftc sdk update --dry-run`
4. `ftc sdk update --yes`
5. `ftc build` and fix any TeamCode API breakages for the new season SDK.

## Notes

- Custom edits under `FtcRobotController/` are replaced by upstream on update. Prefer putting team logic in `TeamCode/`.
- This does **not** flash Control Hub firmware or change Wi-Fi settings.
- Android Studio users historically merge upstream manually; this tool automates the same class of file sync with explicit confirmation.
