# Dependency installers (no Android Studio)

These scripts install a JDK and Android SDK command-line tools (`adb` / platform-tools). They do **not** install Android Studio.

## Windows

Use either:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1
```

or double-click / run:

```text
scripts\install-deps-windows.cmd
```

or from the repo root:

```powershell
npm run install-deps:windows
```

## macOS

```bash
bash scripts/install-deps-macos.sh
# or: npm run install-deps:macos
```

## Linux

```bash
bash scripts/install-deps-linux.sh
# or: npm run install-deps:linux
```

Pinned download URLs/checksums: `android-cmdline-tools.json`  
Guide: [`docs/install-without-android-studio.md`](../docs/install-without-android-studio.md)
