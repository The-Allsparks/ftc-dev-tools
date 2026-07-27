# Linux setup

## 1. Install Node.js 20+

Use your distribution packages, NodeSource, nvm, or the official binaries.

```bash
node --version
npm --version
```

## 2. Install a JDK

Prefer:

```bash
bash scripts/install-deps-linux.sh
```

Or install the JDK recommended for your FTC season manually.

```bash
java -version
```

## 3. Install Android SDK platform-tools

Prefer `scripts/install-deps-linux.sh` (see [install-without-android-studio.md](install-without-android-studio.md)).

Manual alternative: install Android Studio or Google's platform-tools package.

Common SDK path:

`~/Android/Sdk`

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb version
```

## 4. USB access permissions

On many Linux systems you need udev rules so non-root users can access Android devices over USB. Ask a mentor for help if `adb devices` shows `no permissions`.

## 5. Gradle Wrapper

```bash
chmod +x gradlew
./gradlew --version
ftc doctor
```
