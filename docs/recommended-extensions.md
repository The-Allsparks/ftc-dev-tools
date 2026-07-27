# Recommended extensions

FTC Dev Tools does **not** reimplement a Java language server. Rookie and advanced teams should rely on maintained VS Code/Cursor extensions for editing, then use FTC Dev Tools for robot-specific build/deploy/diagnose workflows.

Availability and maintenance were checked against public Marketplace listings as of the audit date. Re-verify before changing hard-coded IDs.

## For this repository (FTC Dev Tools development)

See [`.vscode/extensions.json`](../.vscode/extensions.json):

| Extension ID             | Role            |
| ------------------------ | --------------- |
| `dbaeumer.vscode-eslint` | Lint TypeScript |
| `esbenp.prettier-vscode` | Format          |

## For FTC robot projects

Use **FTC: Configure Recommended Extensions** (preview-before-write) to create or update a project `.vscode/extensions.json`.

### Required (practical editing)

| Extension ID               | Why                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `vscjava.vscode-java-pack` | Java language support, debugger packaging, Maven/Gradle helpers commonly needed for TeamCode |

If the pack is undesirable, install at least:

- `redhat.java`
- `vscjava.vscode-java-debug`
- `vscjava.vscode-java-dependency`
- `vscjava.vscode-gradle`

### Recommended

| Extension ID               | Why                                                             |
| -------------------------- | --------------------------------------------------------------- |
| `vscjava.vscode-java-test` | JUnit / Test Explorer integration for pure-logic TeamCode tests |
| `redhat.vscode-xml`        | Robot config / Android XML editing comfort                      |

### Optional

| Extension ID                | Why                                         |
| --------------------------- | ------------------------------------------- |
| `fwcd.kotlin`               | Only if the team writes Kotlin OpModes      |
| `EditorConfig.EditorConfig` | Consistent formatting across OSes           |
| `eamodio.gitlens`           | Git history UX — optional, not FTC-specific |

### Incompatible or redundant with FTC Dev Tools

| Extension / tool                                          | Guidance                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Full Android Studio                                       | Optional; not required when JDK + platform-tools are installed                |
| Duplicate “FTC build” extensions                          | Can coexist, but prefer one deploy path to avoid conflicting device selection |
| Generic Logcat webviews that fight the FTC output channel | Prefer one log surface; see diagnostics roadmap                               |

## Classification summary

| Capability                            | Strategy                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Java completion, navigation, refactor | **Integration with established extension**                                  |
| Gradle classpath / sync feedback      | **Integration with established extension** + FTC doctor for missing JDK/SDK |
| Build / deploy / device select        | **Native FTC Dev Tools feature**                                            |
| Snippets / OpMode templates           | **Native FTC Dev Tools feature**                                            |
| Debugger                              | **Future optional / spike** — see [debugger-spike.md](debugger-spike.md)    |
