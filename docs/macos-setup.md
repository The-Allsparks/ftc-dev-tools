# macOS setup

## 1. Install Node.js

Install Node.js 20+ (official installer, Homebrew, or nvm).

```bash
node --version
npm --version
```

## 2. Install a JDK

Prefer the no-Android-Studio installer:

```bash
bash scripts/install-deps-macos.sh
```

Or install a JDK manually and ensure `java -version` works.

If needed:

```bash
export JAVA_HOME=$(/usr/libexec/java_home)
```

## 3. Install Android SDK platform-tools

Prefer `scripts/install-deps-macos.sh` (see [install-without-android-studio.md](install-without-android-studio.md)).

Manual alternative: install Android Studio or command-line tools, then install platform-tools.

Common SDK path:

`~/Library/Android/sdk`

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb version
```

## 4. Gradle Wrapper permissions

Official projects include `gradlew`. If macOS blocks execution:

```bash
chmod +x gradlew
./gradlew --version
```

## 5. Connect a device

```bash
ftc doctor
ftc devices
```

Accept the USB debugging prompt on the Control Hub or phone.
