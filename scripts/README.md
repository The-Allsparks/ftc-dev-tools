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

## GitHub issue labels

- Policy: [`docs/issue-labels.md`](../docs/issue-labels.md)
- Catalog: `issue-label-catalog.json`
- Validate: `npm run check:issue-labels`
- Apply missing labels: `node scripts/issue-labels.mjs apply --dry-run`
