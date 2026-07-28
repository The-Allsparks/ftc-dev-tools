# Environment doctor (`ftc doctor`)

The doctor command checks **machine readiness** (JDK, Android SDK, adb, Node) separately from **project readiness** (official FTC layout, Gradle wrapper, Gradle init). Optional **robot** and **other** sections cover devices, Wi-Fi, and SDK freshness.

The **Supported JDK version** check requires JDK 17 (matching current FTC seasons and the `install-deps` scripts). Other Java versions fail with install guidance; see [install-without-android-studio.md](install-without-android-studio.md).

## CLI

```bash
ftc doctor
ftc doctor --json
ftc doctor --verbose
```

Human output prints section headers (`Machine readiness`, `Project readiness`, …) so a missing JDK does not look like a broken FTC project when you opened the wrong folder.

## JSON schema

Stable JSON is emitted with `--json` and returned by the MCP `doctor` tool.

- Schema file: [`packages/shared/schemas/doctor-report.schema.json`](../packages/shared/schemas/doctor-report.schema.json)
- `$id` / URL constant: `DOCTOR_REPORT_SCHEMA_URL` in `@ftc-dev-tools/shared`

Top-level fields:

| Field       | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `ready`     | Overall pass (required checks + readiness flags)                                            |
| `readiness` | `computerReady`, `projectReadyToBuild`, `robotReadyToDeploy`                                |
| `checks`    | Flat list (backward compatible)                                                             |
| `sections`  | `machine`, `project`, optional `robot` / `other` with nested checks and `ready` per section |

Each check includes optional `category` matching its section id.

## Wrong folder

If the working directory is not an FTC project root, project checks fail with guidance to open the folder that contains `settings.gradle`, `gradlew` (or `gradlew.bat`), and `TeamCode`. See [troubleshooting.md](troubleshooting.md).

## MCP

The `doctor` tool mirrors `ftc doctor --json`. See [mcp.md](mcp.md).
