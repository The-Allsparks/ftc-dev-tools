# Physical device testing

Ordinary CI and unit tests use mocked processes and `MockDeviceProvider`. They do **not** require a Control Hub.

## Test layers

| Layer                      | What it proves                                          | Requires hardware?       |
| -------------------------- | ------------------------------------------------------- | ------------------------ |
| Unit / mocked integration  | Parsing, selection rules, error text, dry-run flows     | No                       |
| Local Android device       | Real `adb install` / logcat against some Android device | Yes (any Android device) |
| REV Control Hub validation | Real Control Hub deploy + authorize + logs              | Yes (Control Hub)        |

Do not blur these layers in docs or release notes.

For the end-to-end **golden path** (install → doctor → build → deploy → logs on a Control Hub), use the dedicated [golden-path test protocol](testing/golden-path.md) and [validation matrix](testing/validation-matrix.md).

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
- Never flash Expansion Hub / Control Hub **firmware** as an automatic background action
- Never change hub Wi-Fi credentials or OS without explicit confirmation and a recovery plan (see [wifi.md](wifi.md) and [hub-update.md](hub-update.md))
- Never uninstall automatically to “make deploy work”
- Record results using the maturity template in [feature-maturity.md](feature-maturity.md) without personal data
