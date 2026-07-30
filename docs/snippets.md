# FTC Java snippets

Versioned, generic Java snippets contributed by the FTC Dev Tools extension.

## Design

- Small high-value set (not hundreds of fragile copies)
- Prefixes start with `ftc-`
- No team-specific package names (placeholder `org.firstinspires.ftc.teamcode`)
- Hardware names are editable tab stops
- Safe motor shutdown examples (`setPower(0)`, `finally`, `ZeroPowerBehavior.BRAKE`)
- No season-specific game logic

## Provenance and licensing

Snippets are original educational templates maintained by FTC Dev Tools contributors.
They intentionally resemble patterns from the official FTC SDK samples
([FtcRobotController external samples](https://github.com/FIRST-Tech-Challenge/FtcRobotController/tree/master/FtcRobotController/src/main/java/org/firstinspires/ftc/robotcontroller/external/samples))
without bulk-copying sample files.

Official FTC SDK sample code remains under FIRST’s licensing for the SDK repository.
Do not paste copyrighted sample files wholesale into this tree.

## Review process

When changing snippets:

1. Confirm APIs against the current season FTC SDK
2. Keep placeholders generic
3. Update the snippet test (`packages/vscode-extension/tests/snippets.test.ts`)
4. Note the change in `CHANGELOG.md`

## Prefixes

| Prefix              | Purpose                     |
| ------------------- | --------------------------- |
| `ftc-teleop`        | Iterative TeleOp            |
| `ftc-teleop-linear` | Linear TeleOp               |
| `ftc-auto`          | Linear Autonomous           |
| `ftc-motor`         | DcMotorEx init              |
| `ftc-servo`         | Servo init                  |
| `ftc-gamepad-edge`  | Button rising edge          |
| `ftc-imu`           | IMU init                    |
| `ftc-telemetry`     | Telemetry                   |
| `ftc-elapsed`       | ElapsedTime                 |
| `ftc-vision`        | VisionPortal skeleton       |
| `ftc-apriltag`      | AprilTag processor skeleton |
| `ftc-safe-stop`     | finally zero-power          |

## Vision codegen vs snippets

For full OpMode scaffolds (Limelight, EasyOpenCV, VisionPortal, diagnostic bridge), prefer CLI codegen — it writes files with confirmation gates:

```bash
ftc vision codegen list
ftc vision codegen limelight --class MyTele --yes --dry-run
```

See [Vision Lab](./vision-lab.md). Snippets remain quick inserts; codegen targets repeatable project files.

Kotlin snippets are optional future work.
