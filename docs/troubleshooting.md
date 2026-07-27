# Troubleshooting

Start with:

```bash
ftc doctor
ftc doctor --json
```

## Common problems

### Not an FTC project

Open the repository root that contains `settings.gradle`, not a nested `TeamCode` folder only.

### Gradle Wrapper missing

Restore `gradlew` / `gradlew.bat` and `gradle/wrapper/` from version control. Do not rely on a globally installed Gradle as a substitute.

### Java problems

Install the JDK version required by your FTC season and set `JAVA_HOME`.

### Android SDK / adb missing

Install platform-tools and set `ANDROID_HOME` or `ANDROID_SDK_ROOT`.

### No devices / unauthorized / offline

See [device-connections.md](device-connections.md).

### Multiple devices

Pass `--device <serial>` or disconnect extras.

### Signature conflict on install

The app on the device was signed differently. FTC Dev Tools will **not** uninstall automatically. Uninstall manually only if you intend to, then redeploy.

### Build failed with “cannot find symbol”

Fix the first compiler error in your TeamCode. Re-run with `ftc build --verbose`.

### Dependency download / network failures

School networks often block or throttle Maven repositories. Retry on a different network or ask a mentor about proxy settings.

## Getting help

Include:

- OS and Node version
- `ftc doctor --json`
- Redacted verbose logs
- Whether you used USB or Wi-Fi adb

Never paste passwords or Wi-Fi credentials.
