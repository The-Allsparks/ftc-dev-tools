# Getting started

This guide is for FTC students, coaches, and mentors who want to build and deploy robot code from VS Code, Cursor, or a terminal.

## What you need

1. A computer on Windows, macOS, or Linux
2. Node.js 20 or newer
3. A JDK version recommended for your FTC season
4. Android SDK **platform-tools** (provides `adb`)
5. Your team's official FTC Android Studio project

Android Studio is optional. To install the JDK + SDK tools without it:

- **Windows:** `scripts\install-deps-windows.cmd` or `powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1`
- **macOS:** `bash scripts/install-deps-macos.sh`
- **Linux:** `bash scripts/install-deps-linux.sh`

Full guide: [install-without-android-studio.md](install-without-android-studio.md).

## Install FTC Dev Tools from source

```bash
git clone https://github.com/ftc-dev-tools/ftc-dev-tools.git
cd ftc-dev-tools
npm install
npm run build
npm link --workspace @ftc-dev-tools/cli
```

## Check your computer

Open a terminal in your FTC project folder:

```bash
ftc doctor
```

You want a checklist similar to:

```text
FTC Development Check

✓ FTC project detected
✓ Gradle Wrapper found
✓ Java found
✓ Android SDK found
✓ adb found
✓ REV Control Hub connected and authorized

Ready to deploy.
```

If something fails, read the next steps printed by the tool. Use `ftc doctor --json` when asking for help online.

## Connect a device

```bash
ftc devices
```

If more than one Android device is connected, you must choose one explicitly. The tools will not guess.

## Build and deploy

```bash
ftc build
ftc deploy --device YOUR_SERIAL
```

Or combine:

```bash
ftc deploy --device YOUR_SERIAL
```

Dry run (no device changes):

```bash
ftc deploy --dry-run --device YOUR_SERIAL
```

## View logs

```bash
ftc logs --teamcode
ftc logs --errors
ftc logs --raw
```

Press Ctrl+C to stop.

## Use the editor extension

1. Package: `npm run package:extension`
2. Install the `.vsix`
3. Open your FTC project folder
4. Use Command Palette commands starting with `FTC:`

## Next reading

- OS setup: [windows-setup.md](windows-setup.md), [macos-setup.md](macos-setup.md), [linux-setup.md](linux-setup.md)
- Devices: [device-connections.md](device-connections.md)
- Config: [configuration.md](configuration.md)
- Problems: [troubleshooting.md](troubleshooting.md)
