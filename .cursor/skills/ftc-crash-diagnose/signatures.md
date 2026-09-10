# Crash search patterns

Run these against the new `logs/hub-<stamp>/` files. Newest match wins unless an older `FATAL` explains a restart-loop.

## Fatal / process death

```
FATAL EXCEPTION
AndroidRuntime
Force finishing activity com.qualcomm.ftcrobotcontroller
pidof changing
```

## Java / ART

```
NoSuchMethodError
NoClassDefFoundError
ClassNotFoundException
VerifyError
ExceptionInInitializerError
UnsatisfiedLinkError
UserCodeException
OpModeException
IllegalStateException
IllegalArgumentException
NullPointerException
```

Known Hub-specific: `No virtual method toPath()` — Android 7 `File.toPath()`.

## FTC OpMode / hardware

```
START - OPMODE
STOP - OPMODE
Attempting to switch to OpMode
Unable to find a hardware device
Required drive motor
Unable to find webcam
exception arming
globalError
ErrorMsg
```

## Team / library tags

Add the team’s OpMode names and library packages. Common extras:

```
TRACE unavailable
TRACE.writerFailed
writerFailed
org.firstinspires.ftc.teamcode
```

## Config vs code

Pull `/sdcard/FIRST/*.xml` and compare device names to `hardwareMap.get(...)` strings in TeamCode. The active config may not be the XML the laptop last edited.

## Logcat one-shot (after files are on disk)

```powershell
Select-String -Path logcat-recent.txt, robotControllerLog.txt -Pattern "FATAL|NoSuchMethod|NoClassDef|UserCode|Unable to find" | Select-Object -Last 80
```
