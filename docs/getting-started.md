# Getting started

This guide is for FTC students, coaches, and mentors who want to build and deploy robot code from VS Code, Cursor, or a terminal.

## In VS Code or Cursor (recommended)

1. Open your FTC project folder (or use **FTC: Get or Open FTC Project**).
2. After installing the extension, open **Walkthrough: Get started with FTC Dev Tools** from the Welcome / Getting Started experience (same steps as below).
3. Run **FTC: Start Here** from the Command Palette — opens a checklist doc, panel checklist, and walks you step by step.
4. On **Prepare this computer**, use **Check & install what's missing** — the environment check decides whether you need JDK, Android SDK/adb, or both, then runs the trusted installer after you confirm.
5. Re-run **FTC: Run Environment Check** after installs and reload the window if PATH changed.

Contributors with a cloned `ftc-dev-tools` repo use local install scripts automatically (no re-download from GitHub).

Terminal-only: `ftc doctor --install-plan` prints JSON for what install-deps would install.

## What you need

1. A computer on Windows, macOS, or Linux
2. Node.js 20 or newer
3. A JDK version recommended for your FTC season
4. Android SDK **platform-tools** (provides `adb`)
5. Your team's official FTC Android Studio project (see **FTC: Get or Open FTC Project** in the editor, or clone [FtcRobotController](https://github.com/FIRST-Tech-Challenge/FtcRobotController) / your team repo with `git`)

Android Studio is optional. To install the JDK + SDK tools without it:

- **Windows:** `scripts\install-deps-windows.cmd` or `powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1`
- **macOS:** `bash scripts/install-deps-macos.sh`
- **Linux:** `bash scripts/install-deps-linux.sh`

Full guide: [install-without-android-studio.md](install-without-android-studio.md).

## Install the `ftc` CLI (recommended)

You do **not** need to clone the FTC Dev Tools repo to use `ftc`.

After a [GitHub Release](https://github.com/The-Allsparks/ftc-dev-tools/releases) is published, install the CLI using the **latest** tarball:

- **Editor:** **FTC: Install FTC CLI** (resolves the newest release automatically), or
- **Terminal:** `node scripts/latest-cli-install.mjs` from this repo (prints the `npm install -g "…"` line), or see [cli-install.md](cli-install.md).

On Windows PowerShell, use `npm.cmd` instead of `npm` if you see an execution-policy error — see [cli-install.md](cli-install.md).

Then open your FTC project folder and run `ftc doctor`.

Details, npm (future), and MCP: [cli-install.md](cli-install.md).

## Install from source (contributors only)

```bash
git clone https://github.com/The-Allsparks/ftc-dev-tools.git
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

For a narrated first program (create OpMode → deploy → Driver Station), see [first-opmode-journey.md](first-opmode-journey.md) or **FTC: First OpMode Journey** in the editor.

Track **Competition readiness** in the FTC sidebar (doctor → device → build → deploy → Driver Station → logs). See [device-connections.md](device-connections.md) when pairing hardware.

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
4. Run **FTC: Get or Open FTC Project** if you still need a team repo or official SDK template on disk
5. Use Command Palette commands starting with `FTC:`

## Next reading

- 0.2 closure checklist (mentors): [onboarding-0.2-closure.md](onboarding-0.2-closure.md)
- OS setup: [windows-setup.md](windows-setup.md), [macos-setup.md](macos-setup.md), [linux-setup.md](linux-setup.md)
- Devices: [device-connections.md](device-connections.md)
- Config: [configuration.md](configuration.md)
- Problems: [troubleshooting.md](troubleshooting.md)
