# First OpMode journey

This is the **hello robot** path for rookies: one new TeleOp or Autonomous OpMode, deploy it, run it from **Driver Station**, and watch **TeamCode** logs if something goes wrong.

**Time:** about 20–30 minutes the first time (mostly waiting on Gradle and deploy), assuming your computer and robot are already set up from [Getting started](getting-started.md).

## In VS Code or Cursor (recommended)

1. Open your FTC project and finish **Connect the robot** in **FTC: Start Here** (or **FTC: Connect My Robot (USB First)**).
2. Run **FTC: First OpMode Journey** from the Command Palette.
3. Follow the prompts:
   - **Create OpMode** — pick TeleOp + LinearOpMode for a first program; use a simple class name like `HelloTeleOp`.
   - **Validate config** — optional; skip if you have not changed hardware configuration.
   - **Build and deploy** — installs the APK on your selected device.
   - **View logs** — optional; streams `ftc logs --teamcode` while you test.
4. On **Driver Station**, use **Init** → pick your OpMode → **Start** (the journey shows a short checklist at the end).

You can also run the same steps individually from Start Here or the FTC sidebar.

## Terminal equivalent

From your project folder (device already selected or pass `--device`):

```bash
ftc opmode create --kind teleop --style linear --class HelloTeleOp --yes
ftc config validate
ftc deploy --device YOUR_SERIAL
ftc logs --teamcode
```

## Manual hardware checklist (after deploy)

Use this when testing with a real robot (not required in CI):

- [ ] Robot battery is charged and the Control Hub / phone is on.
- [ ] USB debugging authorized (or Wi‑Fi adb connected if you use that).
- [ ] Driver Station and Robot Controller are paired (same Wi‑Fi / match number as your team expects).
- [ ] Driver Station **Init** completes without configuration errors.
- [ ] Selected OpMode appears in the list and **Start** runs without immediate disconnect.
- [ ] If the robot does nothing, open logs and look for Java exceptions or missing hardware names.

## Mentors and coaches

- Students can mark **Run your first OpMode** complete in Start Here after a successful Init/Start, even if the OpMode only drives one motor slowly.
- Point teams to [OpModes](opmodes.md) and [configuration](configuration.md) for the next iteration.

## Related

- [Getting started](getting-started.md)
- [OpModes](opmodes.md)
- [Device connections](device-connections.md)
- [Troubleshooting](troubleshooting.md)
