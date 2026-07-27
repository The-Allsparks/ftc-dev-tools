# Install without Android Studio

You do **not** need Android Studio to use FTC Dev Tools in Cursor, VS Code, or a terminal.

You need:

1. A JDK (commonly JDK 17)
2. Android SDK **command-line tools**
3. Android SDK **platform-tools** (`adb`)
4. Usually an Android platform + build-tools package for Gradle builds

This repository includes installer scripts that download Google’s official command-line tools (not Android Studio).

## Windows (recommended first)

In PowerShell from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1
```

Options:

```powershell
# Already have a JDK
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1 -SkipJdk

# Already have an SDK / only need JDK
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1 -SkipSdk
```

What it does:

- Installs Eclipse Temurin JDK 17 via `winget` when Java is missing
- Downloads pinned Android command-line tools (checksum verified)
- Installs `platform-tools`, `platforms;android-34`, and `build-tools;34.0.0` when possible
- Sets user `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and PATH entries

Then **close and reopen** your terminal and Cursor/VS Code, and run:

```powershell
ftc doctor
adb version
java -version
```

## macOS

```bash
bash scripts/install-deps-macos.sh
```

Skip pieces if needed:

```bash
SKIP_JDK=1 bash scripts/install-deps-macos.sh
SKIP_SDK=1 bash scripts/install-deps-macos.sh
```

Requires Homebrew for automatic JDK install when Java is missing.

## Linux

```bash
bash scripts/install-deps-linux.sh
```

```bash
SKIP_JDK=1 bash scripts/install-deps-linux.sh
```

Uses `apt`, `dnf`, or `pacman` for JDK 17 when available.

## Shared pin file

Package URLs and SHA-256 checksums live in:

[`scripts/android-cmdline-tools.json`](../scripts/android-cmdline-tools.json)

Update that file when Google publishes newer command-line tools.

## Safety notes

These scripts:

- Do **not** install Android Studio
- Do **not** modify Control Hub firmware, Wi-Fi, or Android system settings
- Do **not** uninstall apps
- Only install local developer toolchain components on your computer

## If something fails

1. Re-open the terminal so PATH refreshes
2. Run `ftc doctor --verbose`
3. Confirm:
   - `java -version`
   - `adb version`
   - `%LOCALAPPDATA%\Android\Sdk` (Windows) or `~/Library/Android/sdk` / `~/Android/Sdk`

School networks sometimes block Google download hosts. If downloads fail, try another network or ask a mentor.
