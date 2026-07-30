# Troubleshooting

Start with:

```bash
ftc doctor
ftc doctor --json
```

Doctor output is split into **machine** vs **project** sections so tool problems are not confused with opening the wrong folder. JSON shape is documented in [doctor.md](doctor.md).

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

### Optional GitHub error reports

When linked, FTC Dev Tools can file deduplicated issues to [The-Allsparks/ftc-dev-tools](https://github.com/The-Allsparks/ftc-dev-tools/issues) after build, deploy, or doctor failures.

- **Extension:** **FTC: Link GitHub for Error Reports** (Command Palette)
- **CLI:** `ftc github link`, then re-run with `--report` (for example `ftc doctor --report`)

Reports require a GitHub token (`ftc github link`, `GITHUB_TOKEN`, or `GH_TOKEN`). Passwords and Wi-Fi credentials are never included. Maintainers reuse the same token for [maintainer-mcp.md](maintainer-mcp.md).

## Vision Lab

```bash
ftc vision diagnostics --json --redact
ftc vision validation status --json
```

Decision tree and provider guides: [vision-lab.md](vision-lab.md).

Common vision issues:

- **Multiple hosts / devices** — pass `--host`, `--device`, or `--endpoint`; tools never auto-pick
- **Limelight unreachable** — [limelight.md](limelight.md)
- **Webcam not in config** — [visionportal.md](visionportal.md)
- **Dashboard won't load** — [ftc-dashboard.md](ftc-dashboard.md)
