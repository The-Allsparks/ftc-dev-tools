# Windows setup

## Fast path (no Android Studio)

From the `ftc-dev-tools` repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps-windows.ps1
```

This installs a JDK (if needed) and Android command-line SDK components (`adb`, platform tools, and common build packages). Details: [install-without-android-studio.md](install-without-android-studio.md).

Then reopen your terminal / Cursor / VS Code and run `ftc doctor`.

## 1. Install Node.js

Install Node.js 20 LTS or newer from [nodejs.org](https://nodejs.org/).

Check:

```powershell
node --version
npm --version
```

## 2. Install a JDK

Prefer the installer script above, or install JDK 17 manually and set `JAVA_HOME`.

```powershell
java -version
```

## 3. Install Android SDK platform-tools

Prefer the installer script above (no Android Studio required).

Manual alternative many teams still use:

1. Install Android Studio
2. Open SDK Manager
3. Install **Android SDK Platform-Tools**

Typical SDK location:

`%LOCALAPPDATA%\Android\Sdk`

Environment variables:

- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`

Confirm:

```powershell
adb version
```

## 4. USB drivers / cables

- Use a **data** USB cable (not charge-only)
- Accept **Allow USB debugging** on the device when prompted
- For some phones, OEM USB drivers may be required

## 5. Open your FTC project

Open the folder that contains `settings.gradle` and `gradlew.bat`.

```powershell
ftc doctor
ftc devices
```

## PowerShell and Command Prompt

Both work. Prefer calling `ftc` / `adb` directly rather than pasting multi-command one-liners from untrusted sources.
