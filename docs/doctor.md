# Environment doctor (`ftc doctor`)

The doctor command checks **computer setup** (JDK, Android SDK, adb, Node) separately from **FTC project setup** (official layout, Gradle Wrapper, Gradle init). Optional **robot connection** and **other** sections cover devices, Wi‑Fi, and SDK freshness.

## Skip and robot checks

Lines marked `-` (skip) are **not failures**. Many robot and Wi‑Fi checks are skipped when you code at home without the Control Hub plugged in or on your network — that is normal.

| Term               | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| **JDK / Java**     | Compiles your FTC robot code                                     |
| **Android SDK**    | Libraries and tools to build Android apps                        |
| **adb**            | Android Debug Bridge — sends builds to the hub over USB or Wi‑Fi |
| **Gradle Wrapper** | The project's `gradlew` / `gradlew.bat` build script             |
| **FTC SDK**        | FIRST's robot programming libraries your project depends on      |

See [project principles](project-principles.md) — messages should stay understandable to students while still showing technical details when needed (`ftc doctor --verbose`).

## CLI

```bash
ftc doctor
ftc doctor --json
ftc doctor --verbose
```

Human output prints section headers (`Computer setup`, `FTC project setup`, …) so a missing JDK does not look like a broken FTC project when you opened the wrong folder.

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
