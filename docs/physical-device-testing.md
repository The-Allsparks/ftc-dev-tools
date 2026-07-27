# Physical device testing

Ordinary CI and unit tests use mocked processes and `MockDeviceProvider`. They do **not** require a Control Hub.

## Test layers

| Layer                      | What it proves                                          | Requires hardware?       |
| -------------------------- | ------------------------------------------------------- | ------------------------ |
| Unit / mocked integration  | Parsing, selection rules, error text, dry-run flows     | No                       |
| Local Android device       | Real `adb install` / logcat against some Android device | Yes (any Android device) |
| REV Control Hub validation | Real Control Hub deploy + authorize + logs              | Yes (Control Hub)        |

Do not blur these layers in docs or release notes.

## Optional local Android device checklist

1. `adb devices` shows one authorized device
2. `ftc doctor` passes required checks
3. `ftc deploy --dry-run` prints expected steps
4. `ftc build` produces an APK in your real FTC project
5. `ftc deploy --device <serial>` installs and attempts launch
6. `ftc logs --teamcode` streams output
7. Unplug during deploy/logs and confirm recovery guidance is clear

## Optional Control Hub checklist

Only mark Control Hub support as validated after:

1. USB authorize succeeds on a real Control Hub
2. Deploy updates the Robot Controller app intentionally
3. Signature conflict messaging is verified without auto-uninstall
4. Log streaming works and Ctrl+C terminates cleanly
5. Results (date, OS, FTC season/SDK) are recorded in the PR or issue

## Safety reminders

- Never factory-reset as part of a test script
- Never flash firmware
- Never change Wi-Fi settings from this tool
- Never uninstall automatically to “make deploy work”
