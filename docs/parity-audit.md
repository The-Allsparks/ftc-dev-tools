# Parity audit

Evidence-based comparison of **FTC Dev Tools** (this repository, 0.1.0), community **FTC for VS Code** (`Juice16236.ftc-for-vs-code`, source [kidsonfilms-python-rules/FTC-for-VS-Code](https://github.com/kidsonfilms-python-rules/FTC-for-VS-Code)), and the normal **Android Studio + official FTC SDK** workflow.

Classifications:

- `Native FTC Dev Tools feature`
- `Integration with established extension`
- `Documentation/setup responsibility`
- `Not valuable for FTC`
- `Future optional feature`
- `Out of scope`

Columns: Capability | FTC Dev Tools | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap | Recommended action

## FTC for VS Code — implemented vs roadmap

| Advertised                     | Evidence                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| Single press build and install | Marketplace/README: implemented                             |
| Integrated snippets            | Marketplace/README: implemented (from official FTC samples) |
| Integrated debugger            | **Planned** — not implemented                               |
| Integrated robot dashboard     | **Planned** — not implemented                               |

FTC Dev Tools already exceeds FTC for VS Code on doctor, multi-device refusal, SDK update, Wi-Fi/hub helpers, OpMode/config/hwmap, Pedro, MCP, and maturity docs. The clearest implemented gap to close was **snippets** (addressed in this release stream) plus guided onboarding.

## Build and deployment

| Capability                                 | FTC Dev Tools           | FTC for VS Code     | Android Studio FTC workflow | External VS Code extension | Gap                   | Recommended action                                     |
| ------------------------------------------ | ----------------------- | ------------------- | --------------------------- | -------------------------- | --------------------- | ------------------------------------------------------ |
| Detect FTC project                         | Yes                     | Partial/assumed     | Import project              | —                          | Low                   | `Native` — keep                                        |
| Gradle project initialization              | Docs / install scripts  | Assumes SDK present | New project wizard          | —                          | Medium                | `Documentation/setup`                                  |
| Gradle synchronization feedback            | Via Gradle for Java ext | Limited             | Native sync UI              | Gradle for Java            | Medium                | `Integration`                                          |
| Build debug APK                            | `ftc build`             | Build button        | Build variants              | —                          | Low                   | `Native`                                               |
| Clean                                      | `ftc clean`             | Unknown/limited     | Clean                       | —                          | Low                   | `Native`                                               |
| Install/update APK                         | `ftc deploy`            | Install             | Run                         | —                          | Low                   | `Native`                                               |
| Select device                              | Explicit / refuse multi | Unknown             | Device chooser              | —                          | Low                   | `Native` — keep refusal                                |
| Multiple-device refusal                    | Yes                     | Unknown             | Chooser                     | —                          | Low                   | `Native`                                               |
| USB deployment                             | Yes                     | Yes (assumed)       | Yes                         | —                          | Needs hardware matrix | `Native` + physical tests                              |
| Wi-Fi deployment                           | Yes (Wi-Fi ADB helpers) | Limited docs        | Wireless debugging          | —                          | Needs hardware matrix | `Native`                                               |
| Launch/restart RC                          | Launch on deploy        | Likely              | Run                         | —                          | Low                   | `Native`                                               |
| Deployment cancellation                    | Progress + abort paths  | Unknown             | Cancel                      | —                          | Medium                | Harden UX                                              |
| Deployment progress                        | Output channel / CLI    | Button UX           | Progress UI                 | —                          | Low                   | Improve messages                                       |
| Deployment history                         | No                      | No                  | Limited                     | —                          | Low                   | `Future optional`                                      |
| Build variants                             | Debug-focused           | Debug-focused       | Full variants               | —                          | Low                   | `Future optional`                                      |
| Release APK / signing                      | No                      | No                  | Yes                         | —                          | Low for FTC matches   | `Not valuable for FTC` (competition uses RC app model) |
| APK discovery                              | Yes                     | Assumed             | Yes                         | —                          | Low                   | `Native`                                               |
| Incremental build / cache / offline Gradle | Gradle Wrapper behavior | Same                | Studio UI                   | Gradle for Java            | Low                   | `Integration` / `Documentation`                        |
| Dependency refresh                         | Via Gradle              | Via Gradle          | Studio                      | Gradle for Java            | Low                   | `Integration`                                          |
| Gradle daemon troubleshooting              | Doctor + docs           | Limited             | Studio                      | —                          | Low                   | `Documentation`                                        |

## Environment and setup

| Capability                   | FTC Dev Tools               | FTC for VS Code           | Android Studio FTC workflow | External VS Code extension | Gap     | Recommended action       |
| ---------------------------- | --------------------------- | ------------------------- | --------------------------- | -------------------------- | ------- | ------------------------ |
| JDK discovery                | Doctor                      | Assumed                   | Bundled/Studio              | Java pack                  | Low     | `Native` + `Integration` |
| JDK compatibility check      | Doctor                      | Assumed                   | Studio                      | Java pack                  | Low     | `Native`                 |
| Android SDK / platform-tools | Doctor + install scripts    | Required in README        | Studio SDK manager          | —                          | Low     | `Native` + docs          |
| Gradle Wrapper validation    | Detection                   | Assumed                   | Yes                         | —                          | Low     | `Native`                 |
| SDK package installation     | Guided scripts (non-silent) | Manual                    | SDK Manager                 | —                          | Medium  | Setup wizard             |
| Env var setup                | Docs + scripts              | Manual                    | Studio                      | —                          | Medium  | Setup wizard             |
| Windows / macOS / Linux      | Docs + CI                   | Not clearly matrixed      | Yes                         | —                          | Medium  | Keep OS docs + CI        |
| Paths with spaces            | Careful spawn               | Unknown                   | Usually OK                  | —                          | Medium  | Test matrix              |
| Permission repair            | Docs                        | No                        | Partial                     | —                          | Medium  | Docs                     |
| New-student onboarding       | Docs + setup commands       | Minimal requirements list | Studio tutorials            | —                          | Closing | Guided setup             |
| Reproducible team setup      | `.ftc-dev.json` + docs      | No                        | Checklists                  | —                          | Medium  | Project setup command    |
| Dev container                | No                          | No                        | No                          | Dev Containers             | Low     | `Future optional`        |
| Portable/offline install     | Partial scripts             | No                        | Offline SDK possible        | —                          | Medium  | Docs                     |

## Java and Kotlin editing

| Capability                                                | FTC Dev Tools              | FTC for VS Code     | Android Studio FTC workflow | External VS Code extension | Gap                       | Recommended action                 |
| --------------------------------------------------------- | -------------------------- | ------------------- | --------------------------- | -------------------------- | ------------------------- | ---------------------------------- |
| Completion / navigation / refactor / diagnostics / format | Via recommended extensions | Via Java extensions | Native                      | Java Extension Pack        | None if configured        | `Integration` — do not reimplement |
| Gradle classpath                                          | Via Gradle for Java        | Assumed             | Native                      | Gradle for Java            | Configure recommendations | `Integration`                      |
| Kotlin                                                    | Optional ext               | Unknown             | Native                      | Kotlin ext                 | Optional                  | `Integration`                      |
| Annotation processing / nullability / static analysis     | Via Java tooling           | Via Java tooling    | Lint etc.                   | Java pack                  | None                      | `Integration`                      |
| Package/class creation                                    | OpMode create + snippets   | Snippets            | Wizards                     | —                          | Low                       | `Native` templates + snippets      |

## FTC code authoring

| Capability                       | FTC Dev Tools                      | FTC for VS Code       | Android Studio FTC workflow | External VS Code extension | Gap     | Recommended action                 |
| -------------------------------- | ---------------------------------- | --------------------- | --------------------------- | -------------------------- | ------- | ---------------------------------- |
| TeleOp / Autonomous templates    | `ftc opmode create` + snippets     | Snippets              | Samples / new class         | —                          | Low     | `Native`                           |
| Iterative vs linear              | Supported in create/snippets       | Sample-derived        | Samples                     | —                          | Low     | `Native`                           |
| Disabled/sample OpModes          | Via SDK samples on disk            | Snippets from samples | Samples module              | —                          | Medium  | Sample browser issue               |
| Package selection / class naming | Validated on create                | Snippet placeholders  | Studio                      | —                          | Low     | `Native`                           |
| Snippets                         | Versioned generic set              | Integrated snippets   | Live templates              | —                          | Closing | `Native` — keep small + provenance |
| SDK sample discovery / copy      | Pedro scaffold; no general browser | Snippet copies        | Copy from samples           | —                          | Medium  | `Future optional` sample browser   |
| Hardware map codegen             | `ftc hwmap`                        | No                    | Manual / OnBot-like         | —                          | Ahead   | `Native`                           |
| Robot config validation          | `ftc config validate`              | No                    | DS/RC                       | —                          | Ahead   | `Native`                           |
| Kotlin OpMode templates          | Limited                            | Unknown               | Possible                    | —                          | Low     | Optional later                     |
| Pathing-library templates        | Pedro helpers                      | No                    | Manual                      | —                          | Ahead   | `Native` (Pedro)                   |

## Debugging

| Capability             | FTC Dev Tools       | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap      | Recommended action                                   |
| ---------------------- | ------------------- | --------------- | --------------------------- | -------------------------- | -------- | ---------------------------------------------------- |
| Breakpoint debug on RC | Not shipped (spike) | Planned only    | Yes (Android debugger)      | Java debugger              | Large    | Spike first — [debugger-spike.md](debugger-spike.md) |
| Safety while paused    | Documented in spike | Not documented  | User caution                | —                          | Critical | Mandatory warnings if ever shipped                   |

## Logcat and diagnostics

| Capability                       | FTC Dev Tools                 | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap    | Recommended action      |
| -------------------------------- | ----------------------------- | --------------- | --------------------------- | -------------------------- | ------ | ----------------------- |
| Stream logs                      | Yes                           | Limited/unknown | Logcat panel                | Optional Logcat exts       | Medium | Improve filters         |
| Severity / package / tag filters | Partial (errors/teamcode/raw) | Unknown         | Full                        | Various                    | Medium | Package-aware filters   |
| Clickable stack traces           | No                            | No              | Yes                         | Some exts                  | Medium | Implement               |
| Export / diagnostic bundle       | No                            | No              | Export                      | —                          | Medium | Redacted bundle command |
| Problems integration             | Friendly errors               | Unknown         | Yes                         | —                          | Medium | Selective conversion    |
| Reconnect after device loss      | Partial messaging             | Unknown         | Yes                         | —                          | Medium | Harden                  |

## Tests

| Capability               | FTC Dev Tools | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap                | Recommended action       |
| ------------------------ | ------------- | --------------- | --------------------------- | -------------------------- | ------------------ | ------------------------ |
| JVM unit tests for logic | Docs planned  | No              | Gradle/JUnit                | Java Test Runner           | Medium             | Docs + starter + command |
| Instrumentation tests    | No            | No              | Yes                         | Limited                    | Low for most teams | `Future optional`        |
| Duplicate Test Explorer  | Avoid         | —               | Studio                      | Java Test                  | —                  | `Out of scope`           |

## SDK management

| Capability                        | FTC Dev Tools | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap    | Recommended action          |
| --------------------------------- | ------------- | --------------- | --------------------------- | -------------------------- | ------ | --------------------------- |
| Check / update / dry-run / backup | Yes           | No              | Manual merge                | —                          | Ahead  | Harden plan/verify/rollback |
| Multi-version fixtures            | Partial tests | —               | —                           | —                          | Medium | More fixtures               |
| Preserve TeamCode                 | Guaranteed    | N/A             | Manual                      | —                          | —      | Keep invariant              |

## Robot configuration

| Capability                    | FTC Dev Tools | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap       | Recommended action              |
| ----------------------------- | ------------- | --------------- | --------------------------- | -------------------------- | --------- | ------------------------------- |
| List / show / validate / pull | Yes           | No              | DS/RC + files               | —                          | Ahead     | Keep; no unsafe push yet        |
| Compare code names to config  | No            | No              | Manual                      | —                          | Medium    | Future command                  |
| Push/edit on hub              | No            | No              | DS/RC                       | —                          | High risk | Only after format/safety proven |

## Device and Control Hub management

| Capability                 | FTC Dev Tools       | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap             | Recommended action                   |
| -------------------------- | ------------------- | --------------- | --------------------------- | -------------------------- | --------------- | ------------------------------------ |
| Discovery / auth / offline | Yes                 | Basic adb       | Yes                         | —                          | Needs CH matrix | Physical validation                  |
| RC web console             | Yes                 | No              | Browser                     | —                          | Ahead           | Keep                                 |
| Hub OS update helpers      | Yes (explicit)      | No              | REV Hardware Client         | —                          | High risk       | Experimental labels + physical tests |
| Driver Hub                 | Status/docs limited | No              | REV tools                   | —                          | Medium          | Document limits                      |

## Telemetry and dashboard

| Capability         | FTC Dev Tools | FTC for VS Code | Android Studio FTC workflow | External VS Code extension | Gap              | Recommended action                       |
| ------------------ | ------------- | --------------- | --------------------------- | -------------------------- | ---------------- | ---------------------------------------- |
| Live IDE dashboard | No (spike)    | Planned only    | DS telemetry                | FTC Dashboard              | Prefer integrate | [telemetry-spike.md](telemetry-spike.md) |

## Android Studio features intentionally not duplicated

| Capability                         | Classification                          | Why                                         |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Android XML visual layout editor   | `Not valuable for FTC` / `Out of scope` | TeamCode rarely needs Activity layouts      |
| Android emulator                   | `Not valuable for FTC`                  | Robots need real hardware / hub             |
| APK analyzer / full profiler       | `Out of scope`                          | Occasional power-user; use Studio if needed |
| Android resource designer          | `Not valuable for FTC`                  |                                             |
| General Git UI                     | `Integration` / optional                | GitLens etc.                                |
| Generic terminal                   | Built into VS Code                      |                                             |
| Generic Java language server       | `Integration`                           | Java Extension Pack                         |
| General-purpose refactoring engine | `Integration`                           |                                             |
| Android Compose tools              | `Not valuable for FTC`                  |                                             |
| App-store release tooling          | `Not valuable for FTC`                  |                                             |
| Database inspector                 | `Not valuable for FTC`                  |                                             |

## Practical FTC workflow parity checklist

Use the phrase **practical FTC workflow parity** only when these are adequately addressed:

- Code editing through recommended language tooling
- Build and deployment
- Logs and diagnostics
- Tests
- SDK samples and documentation
- Robot configuration workflow
- Device management
- Reliable onboarding

Interactive breakpoint debugging remains a **separate advanced capability**.

## Snapshot verdict (audit date)

FTC Dev Tools provides a broader **implemented** FTC-specific surface than FTC for VS Code. Remaining gaps toward practical workflow parity are primarily diagnostics UX, onboarding polish, test starters, physical validation, and optional debugger/telemetry — not basic build/deploy.
