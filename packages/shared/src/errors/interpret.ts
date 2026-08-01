import type { FriendlyError } from "../types/errors.js";
import { detectAdbInstallErrorCode } from "../devices/parse-adb-install.js";
import { VISION_DIAGNOSTIC_CODES } from "../vision/diagnostics/codes.js";
import { FRIENDLY_BY_CODE } from "../vision/diagnostics/friendly.js";

export interface ErrorContext {
  text: string;
  codeHint?: string;
}

interface ErrorRule {
  code: string;
  test: (ctx: ErrorContext) => boolean;
  title: string;
  summary: string;
  suggestedActions: string[];
}

const RULES: ErrorRule[] = [
  {
    code: "CANNOT_FIND_SYMBOL",
    test: ({ text }) => /cannot find symbol/i.test(text),
    title: "Java cannot find a symbol",
    summary:
      "The compiler could not find a class, method, or variable name used in your code. This usually means a typo, a missing import, or code that was renamed.",
    suggestedActions: [
      "Search your TeamCode for the symbol named in the error.",
      "Check that imports match the FTC SDK packages you are using.",
      "Rebuild with `ftc build --verbose` and read the first error first.",
    ],
  },
  {
    code: "INCOMPATIBLE_JAVA",
    test: ({ text, codeHint }) =>
      codeHint === "INCOMPATIBLE_JAVA" ||
      /unsupported class file major version|invalid source release|java\.lang\.UnsupportedClassVersionError|JVM version/i.test(
        text,
      ),
    title: "Incompatible Java version",
    summary:
      "The Java version on this computer does not match what the FTC Android project expects.",
    suggestedActions: [
      "Install a JDK version recommended by the current FTC SDK release notes (often JDK 17).",
      "Prefer the repo installer (no Android Studio): scripts/install-deps-windows.ps1, scripts/install-deps-macos.sh, or scripts/install-deps-linux.sh.",
      "Set JAVA_HOME to that JDK and reopen your terminal.",
      "Run `ftc doctor` to confirm Java is detected.",
    ],
  },
  {
    code: "ANDROID_SDK_NOT_FOUND",
    test: ({ text, codeHint }) =>
      codeHint === "ANDROID_SDK_NOT_FOUND" ||
      /SDK location not found|ANDROID_HOME|Android SDK/i.test(text),
    title: "Android SDK not found",
    summary: "The Android SDK path could not be found. Builds and adb need the SDK platform-tools.",
    suggestedActions: [
      "Run the no-Android-Studio installer in docs/install-without-android-studio.md (scripts/install-deps-*).",
      "Or install Android Studio / command-line SDK platform-tools manually.",
      "Set ANDROID_HOME (or ANDROID_SDK_ROOT) to your SDK folder.",
      "Confirm platform-tools is installed so `adb` exists.",
    ],
  },
  {
    code: "GRADLE_WRAPPER_MISSING",
    test: ({ text, codeHint }) =>
      codeHint === "GRADLE_WRAPPER_MISSING" || /gradlew(\.bat)?.*(not found|missing)/i.test(text),
    title: "Gradle Wrapper missing",
    summary:
      "This folder does not contain the Gradle Wrapper files that official FTC projects ship with.",
    suggestedActions: [
      "Open the root of your FTC Android Studio project (the folder with settings.gradle).",
      "Restore gradlew / gradlew.bat and the gradle/wrapper directory from version control.",
      "Do not install a global Gradle version as a substitute for the wrapper.",
    ],
  },
  {
    code: "GRADLE_PERMISSION_DENIED",
    test: ({ text, codeHint }) =>
      codeHint === "GRADLE_PERMISSION_DENIED" || /gradlew.*permission denied|EACCES/i.test(text),
    title: "Gradle Wrapper is not executable",
    summary: "On macOS/Linux the gradlew script needs execute permission.",
    suggestedActions: [
      "Run `chmod +x gradlew` in the project root.",
      "Try `./gradlew tasks` to confirm it starts.",
    ],
  },
  {
    code: "ADB_NOT_FOUND",
    test: ({ text, codeHint }) =>
      codeHint === "ADB_NOT_FOUND" || /adb.*(not found|is not recognized)|ENOENT.*adb/i.test(text),
    title: "adb not found",
    summary: "Android Debug Bridge (adb) is required to talk to the Control Hub or phone.",
    suggestedActions: [
      "Run scripts/install-deps-windows.ps1 (or the macOS/Linux script) to install platform-tools without Android Studio.",
      "Add platform-tools to your PATH, or set ANDROID_HOME.",
      "Run `ftc doctor` after installing.",
    ],
  },
  {
    code: "NO_DEVICES",
    test: ({ text, codeHint }) =>
      codeHint === "NO_DEVICES" || /no devices\/emulators found|no connected devices/i.test(text),
    title: "No robot devices found",
    summary: "No connected robot devices were detected (adb reported none).",
    suggestedActions: [
      "Connect the Control Hub or Robot Controller phone with a data USB cable.",
      "Accept the USB debugging prompt if shown.",
      "Try a different cable/port, then run `ftc devices`.",
    ],
  },
  {
    code: "DEVICE_UNAUTHORIZED",
    test: ({ text, codeHint }) =>
      codeHint === "DEVICE_UNAUTHORIZED" || /device unauthorized|unauthorized/i.test(text),
    title: "Device unauthorized",
    summary: "The device is connected but has not authorized this computer for USB debugging.",
    suggestedActions: [
      "Unlock the device screen.",
      "Accept Allow USB debugging on the device.",
      "If no prompt appears, revoke USB debugging authorizations and reconnect.",
    ],
  },
  {
    code: "DEVICE_OFFLINE",
    test: ({ text, codeHint }) => codeHint === "DEVICE_OFFLINE" || /\boffline\b/i.test(text),
    title: "Device offline",
    summary: "adb sees the device serial, but the connection is offline.",
    suggestedActions: [
      "Unplug and reconnect the device.",
      "Run `adb kill-server` then `adb start-server`.",
      "For Wi-Fi adb, reconnect with `adb connect <ip>:5555`.",
    ],
  },
  {
    code: "MULTIPLE_DEVICES",
    test: ({ text, codeHint }) =>
      codeHint === "MULTIPLE_DEVICES" || /more than one device|multiple devices/i.test(text),
    title: "Multiple devices connected",
    summary:
      "More than one robot device is connected. FTC Dev Tools will not guess which one to use.",
    suggestedActions: [
      "Run `ftc devices` to list serials.",
      "Deploy with `ftc deploy --device <serial>`.",
      "Or disconnect devices you do not intend to use.",
    ],
  },
  {
    code: "NO_MATCHING_CONNECTION",
    test: ({ text, codeHint }) =>
      codeHint === "NO_MATCHING_CONNECTION" || /no authorized (usb|wifi) device found/i.test(text),
    title: "No device matches preferred connection",
    summary:
      "Connected devices do not match the preferred USB or Wi-Fi connection setting in `.ftc-dev.json`.",
    suggestedActions: [
      "Run `ftc devices` and check each device connection type.",
      "Deploy with `ftc deploy --device <serial>` to override.",
      'Or set deployment.preferredConnection to "any" in `.ftc-dev.json`.',
    ],
  },
  {
    code: "APK_NOT_FOUND",
    test: ({ text, codeHint }) => codeHint === "APK_NOT_FOUND" || /apk not found/i.test(text),
    title: "APK not found after build",
    summary: "The build finished without a known APK path in the usual FTC output folders.",
    suggestedActions: [
      "Run `ftc build --verbose` and confirm assembleDebug succeeded.",
      "Check TeamCode/build/outputs/apk and FtcRobotController/build/outputs/apk.",
      "Report an unsupported project layout if your outputs differ.",
    ],
  },
  {
    code: "INSTALL_SIGNATURE_CONFLICT",
    test: ({ text, codeHint }) =>
      codeHint === "INSTALL_SIGNATURE_CONFLICT" ||
      detectAdbInstallErrorCode(text) === "INSTALL_SIGNATURE_CONFLICT",
    title: "Installation signature conflict",
    summary:
      "The APK on the device was signed differently from the one you are installing. Automatic uninstall is never performed.",
    suggestedActions: [
      "Confirm you intend to replace the existing Robot Controller app.",
      "Uninstall manually on the device or with an explicit adb uninstall command you run yourself.",
      "Then redeploy with `ftc deploy`.",
    ],
  },
  {
    code: "INSUFFICIENT_STORAGE",
    test: ({ text, codeHint }) =>
      codeHint === "INSUFFICIENT_STORAGE" ||
      detectAdbInstallErrorCode(text) === "INSUFFICIENT_STORAGE",
    title: "Not enough storage on the device",
    summary: "The Android device does not have enough free space to install the APK.",
    suggestedActions: [
      "Delete unused apps or files on the device.",
      "Clear old Robot Controller log/cache data if appropriate.",
      "Retry deployment after freeing space.",
    ],
  },
  {
    code: "GRADLE_DAEMON_FAILURE",
    test: ({ text }) => /Unable to start the daemon|Gradle build daemon/i.test(text),
    title: "Gradle daemon failed to start",
    summary: "Gradle could not start its background daemon process.",
    suggestedActions: [
      "Free memory and close other heavy applications.",
      "Ensure JAVA_HOME points to a valid JDK.",
      "Try again; if it keeps failing, reboot and rerun `ftc doctor`.",
    ],
  },
  {
    code: "DEPENDENCY_DOWNLOAD_FAILURE",
    test: ({ text }) =>
      /Could not resolve|Could not download|Received status code 4\d\d|Received status code 5\d\d/i.test(
        text,
      ),
    title: "Dependency download failed",
    summary: "Gradle could not download one or more project dependencies.",
    suggestedActions: [
      "Check your internet connection.",
      "Retry the build; transient network errors are common on school Wi-Fi.",
      "If behind a proxy, configure Gradle proxy settings with a mentor’s help.",
    ],
  },
  {
    code: "SDK_UPDATE_NETWORK",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_UPDATE_NETWORK" ||
      /Failed to reach GitHub|GitHub Releases returned|Failed to download SDK|extract SDK archive/i.test(
        text,
      ),
    title: "Could not reach FTC SDK releases",
    summary: "Checking or downloading the FTC SDK from GitHub failed.",
    suggestedActions: [
      "Connect to the internet and retry `ftc sdk check`.",
      "If offline, SDK freshness cannot be verified; local detection still works.",
      "Ask a mentor about school firewall rules for api.github.com.",
    ],
  },
  {
    code: "NETWORK_UNAVAILABLE",
    test: ({ text }) =>
      /Unknown host|Network is unreachable|Connection timed out|Name or service not known/i.test(
        text,
      ),
    title: "Network unavailable during dependency resolution",
    summary: "Gradle needed the network but could not reach a repository host.",
    suggestedActions: [
      "Connect to the internet and retry.",
      "If offline, you need a machine that already has dependencies cached.",
      "Ask a mentor about school firewall/proxy rules for Maven repositories.",
    ],
  },
  {
    code: "COMPILATION_FAILURE",
    test: ({ text }) => /Compilation failed|BUILD FAILED|javac/i.test(text),
    title: "Compilation failed",
    summary: "The project did not compile successfully.",
    suggestedActions: [
      "Scroll to the first error in the verbose build output.",
      "Fix that error before addressing later cascading messages.",
      "Run `ftc build --verbose` for full technical details.",
    ],
  },
  {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    test: ({ text, codeHint }) =>
      codeHint === "UNSUPPORTED_PROJECT_LAYOUT" ||
      /does not look like an official FTC|unsupported project layout/i.test(text),
    title: "Unsupported or malformed project layout",
    summary: "This folder does not match the expected official FTC Android Studio project layout.",
    suggestedActions: [
      "Open the repository root that contains settings.gradle, FtcRobotController, and TeamCode.",
      "Compare your layout to FIRST’s official FTC SDK sample project.",
      "Open a GitHub issue describing your layout if you believe it should be supported.",
    ],
  },
  {
    code: "SDK_DEPS_MISSING",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_DEPS_MISSING" ||
      /build\.dependencies\.gradle.*(missing|no org\.firstinspires)/i.test(text),
    title: "FTC SDK dependencies not found",
    summary:
      "Could not read org.firstinspires.ftc Maven coordinates from build.dependencies.gradle.",
    suggestedActions: [
      "Open the official FTC Android Studio project root (the folder with build.dependencies.gradle).",
      "Restore build.dependencies.gradle from version control or the FTC SDK release.",
      "Run `ftc sdk check` again.",
    ],
  },
  {
    code: "SDK_VERSION_MISMATCH",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_VERSION_MISMATCH" ||
      /FTC Maven artifact versions are inconsistent/i.test(text),
    title: "Inconsistent FTC SDK artifact versions",
    summary:
      "Different org.firstinspires.ftc libraries in build.dependencies.gradle use different versions.",
    suggestedActions: [
      "Align all org.firstinspires.ftc:* coordinates to the same version.",
      "Or run `ftc sdk update` to sync from an official release.",
    ],
  },
  {
    code: "SDK_UPDATE_DIRTY_TREE",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_UPDATE_DIRTY_TREE" ||
      (/Git working tree is dirty/i.test(text) && !/Pedro/i.test(text)),
    title: "Git working tree is dirty",
    summary: "SDK update refuses to overwrite files while the project has uncommitted changes.",
    suggestedActions: [
      "Commit or stash your changes.",
      "Or pass `--force` if you intentionally want to proceed (a backup is still created).",
    ],
  },
  {
    code: "SDK_UPDATE_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_UPDATE_ABORTED" ||
      /SDK update aborted|confirmation required|TeamCode appeared in SDK update/i.test(text),
    title: "SDK update aborted",
    summary: "The SDK update did not run because confirmation was missing or the plan was unsafe.",
    suggestedActions: [
      "Review `ftc sdk update --dry-run` output.",
      "Re-run with `--yes` after you are sure TeamCode will stay untouched.",
    ],
  },
  {
    code: "SDK_UPDATE_NETWORK",
    test: ({ text, codeHint }) =>
      codeHint === "SDK_UPDATE_NETWORK" ||
      /Failed to reach GitHub|GitHub Releases returned|Failed to download SDK|extract SDK archive/i.test(
        text,
      ),
    title: "Could not reach FTC SDK releases",
    summary: "Checking or downloading the FTC SDK from GitHub failed.",
    suggestedActions: [
      "Connect to the internet and retry `ftc sdk check`.",
      "If offline, SDK freshness cannot be verified; local detection still works.",
      "Ask a mentor about school firewall rules for api.github.com.",
    ],
  },
  {
    code: "WIFI_CONSOLE_UNREACHABLE",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_CONSOLE_UNREACHABLE" ||
      /Robot Controller Console unreachable|Console URL must be http/i.test(text),
    title: "Robot Controller Console unreachable",
    summary:
      "Could not reach the Control Hub Robot Controller Console at the default address (192.168.43.1:8080).",
    suggestedActions: [
      "Connect your PC to the Control Hub Wi-Fi network on the robot network interface.",
      "Run `ftc wifi use-interface` then `ftc wifi route ensure --yes` if you use dual NICs.",
      "Open the console manually with `ftc wifi open-console`.",
    ],
  },
  {
    code: "WIFI_ADB_CONNECT_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_ADB_CONNECT_FAILED" || /adb connect failed|cannot connect to/i.test(text),
    title: "Wireless adb connection failed",
    summary: "adb could not connect to the robot over Wi-Fi.",
    suggestedActions: [
      "Confirm you are on the Control Hub network and the hub is powered.",
      "Run `ftc wifi status` and `ftc devices`.",
      "Try `ftc wifi connect 192.168.43.1:5555 --yes`.",
    ],
  },
  {
    code: "WIFI_TCPIP_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_TCPIP_FAILED" || /adb tcpip failed/i.test(text),
    title: "adb tcpip failed",
    summary: "Could not switch a USB-connected device to wireless adb mode.",
    suggestedActions: [
      "Connect the device with USB and authorize debugging.",
      "Run `ftc devices` and pass `--device <serial>`.",
      "Control Hubs usually already listen on port 5555 over Wi-Fi.",
    ],
  },
  {
    code: "WIFI_NO_USB_DEVICE",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_NO_USB_DEVICE" || /USB device serial required/i.test(text),
    title: "No USB device for tcpip",
    summary: "enable-tcpip requires a USB-connected device serial.",
    suggestedActions: [
      "Connect the robot controller phone or hub with USB.",
      "Run `ftc devices` and pass `--device <serial>`.",
    ],
  },
  {
    code: "WIFI_INTERFACE_NOT_FOUND",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_INTERFACE_NOT_FOUND" ||
      /No robot network interface|Failed to list network interfaces|Interface name required/i.test(
        text,
      ),
    title: "Robot network interface not found",
    summary: "The selected or requested network interface could not be found.",
    suggestedActions: [
      "Run `ftc wifi interfaces` to list adapters.",
      "Run `ftc wifi use-interface <name|index>`.",
      "On dual-NIC setups, pick the adapter joined to the Control Hub Wi-Fi.",
    ],
  },
  {
    code: "WIFI_ROUTE_ELEVATION_REQUIRED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_ROUTE_ELEVATION_REQUIRED" ||
      /requires an elevated shell|Access is denied.*route/i.test(text),
    title: "Administrator rights required for robot route",
    summary: "Adding the Control Hub subnet route requires an elevated terminal.",
    suggestedActions: [
      "Re-run the command in an Administrator / elevated terminal.",
      "On Windows: right-click Terminal → Run as administrator.",
    ],
  },
  {
    code: "WIFI_ROUTE_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_ROUTE_FAILED" ||
      /Failed to modify robot subnet route|Route change requires --yes/i.test(text),
    title: "Robot subnet route change failed",
    summary: "Could not add or remove the route for the Control Hub network.",
    suggestedActions: [
      "Run `ftc wifi route ensure --yes` from an elevated shell if needed.",
      "Verify the robot interface with `ftc wifi interfaces`.",
    ],
  },
  {
    code: "WIFI_JOIN_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_JOIN_FAILED" ||
      /Failed to join Wi-Fi|netsh connect failed|nmcli connect failed|networksetup failed|Wi-Fi join requires/i.test(
        text,
      ),
    title: "Could not join robot Wi-Fi",
    summary: "Joining the Control Hub SSID on the selected network interface failed.",
    suggestedActions: [
      "Confirm the SSID and password.",
      "Select the robot NIC with `ftc wifi use-interface`.",
      "On Windows, try from an elevated terminal if the adapter is restricted.",
    ],
  },
  {
    code: "WIFI_PASSWORD_MISSING",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_PASSWORD_MISSING" || /Wi-Fi password missing/i.test(text),
    title: "Wi-Fi password missing",
    summary: "No password was provided or stored for this SSID.",
    suggestedActions: [
      "Set env FTC_WIFI_PASSWORD and pass `--password-env FTC_WIFI_PASSWORD`.",
      "Or join once with a password to store it in the machine-local encrypted secret file.",
      "Never put passwords in `.ftc-dev.json`.",
    ],
  },
  {
    code: "WIFI_MANAGE_API_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_MANAGE_API_UNSUPPORTED" ||
      /Manage API|manage endpoints unsupported|Empty manage set|Manage set requires/i.test(text),
    title: "Hub Wi-Fi manage API unsupported",
    summary:
      "This Robot Controller build did not accept automated Apply Wi-Fi Settings from FTC Dev Tools.",
    suggestedActions: [
      "Run `ftc wifi open-console` and change settings on the Manage page.",
      "After changing SSID/password, reconnect and run `ftc wifi connect --yes`.",
      "Open a GitHub issue with your RC app version if automation should work.",
    ],
  },
  {
    code: "WIFI_METRIC_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_METRIC_FAILED" ||
      /Metric change requires --yes|set interface metric failed|Setting interface metrics on macOS/i.test(
        text,
      ),
    title: "Interface metric change failed",
    summary: "Could not change network interface metric for dual-NIC stay-online routing.",
    suggestedActions: [
      "Re-run with `--yes` from an elevated terminal on Windows.",
      "Confirm the interface name with `ftc wifi interfaces`.",
      "On macOS, prefer ethernet for internet and `ftc wifi route ensure` for the hub subnet.",
    ],
  },
  {
    code: "WIFI_ADAPTER_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_ADAPTER_FAILED" ||
      /Adapter change requires --yes|netsh interface set failed|ip link set failed/i.test(text),
    title: "Network adapter enable/disable failed",
    summary: "Could not enable or disable the network adapter.",
    suggestedActions: [
      "Re-run with `--yes` from an elevated terminal.",
      "Check the adapter name with `ftc wifi interfaces`.",
    ],
  },
  {
    code: "WIFI_ADAPTER_LAST_UP",
    test: ({ text, codeHint }) =>
      codeHint === "WIFI_ADAPTER_LAST_UP" || /last up interface/i.test(text),
    title: "Refusing to disable the last up interface",
    summary: "Disabling this adapter would leave no non-loopback network interface up.",
    suggestedActions: [
      "Enable another adapter first.",
      "Or pass `--force` if you intentionally want to disable the last up interface.",
    ],
  },
  {
    code: "HUB_UPDATE_NETWORK",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_NETWORK" ||
      /Failed to fetch Control Hub OS catalog|Download failed|fetch is not available/i.test(text),
    title: "Hub update network error",
    summary: "Could not reach the allowlisted Control Hub OS catalog or download URL.",
    suggestedActions: [
      "Check internet connectivity.",
      "Retry later; REV docs / GitHub may be temporarily unavailable.",
      "Use REV Hardware Client if you need an offline installer bundle.",
    ],
  },
  {
    code: "HUB_UPDATE_URL_BLOCKED",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_URL_BLOCKED" ||
      /not on the allowlist|must be https|must be under REVrobotics/i.test(text),
    title: "Hub update URL blocked",
    summary: "The update URL is not on the FTC Dev Tools allowlist.",
    suggestedActions: [
      "Only use official REV Control Hub OS packages from docs.revrobotics.com / REV-Software-Binaries.",
      "Do not pass arbitrary download URLs.",
    ],
  },
  {
    code: "HUB_UPDATE_CATALOG_EMPTY",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_CATALOG_EMPTY" ||
      /No allowlisted Control Hub OS|OS version not in catalog|not found in catalog/i.test(text),
    title: "Hub OS catalog empty or version missing",
    summary: "Could not find a published Control Hub OS package in the REV changelog catalog.",
    suggestedActions: [
      "Open the REV OS changelog and confirm the download links are present.",
      "Pass `--version` for a known published version, or use REV Hardware Client.",
    ],
  },
  {
    code: "HUB_UPDATE_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_ABORTED" ||
      /Hub OS download requires --yes|Hub OS apply requires --yes/i.test(text),
    title: "Hub update aborted",
    summary: "The hub OS download/apply was not confirmed.",
    suggestedActions: [
      "Re-run with `--dry-run` to preview.",
      "Re-run with `--yes` to proceed (hub will reboot on apply).",
    ],
  },
  {
    code: "HUB_UPDATE_WIFI_ADB_BLOCKED",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_WIFI_ADB_BLOCKED" ||
      /Wi-Fi adb apply requires --allow-wifi-adb/i.test(text),
    title: "Wi-Fi adb blocked for OS apply",
    summary: "Applying a Control Hub OS update over Wi-Fi adb is blocked by default.",
    suggestedActions: [
      "Connect the Control Hub with a USB-C data cable and retry.",
      "Or pass `--allow-wifi-adb` if you accept disconnect risk during reboot.",
    ],
  },
  {
    code: "HUB_UPDATE_APPLY_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_APPLY_UNSUPPORTED" ||
      /Automated OS upload unsupported|No known RC Console OS upload/i.test(text),
    title: "Automated hub OS upload unsupported",
    summary:
      "This Robot Controller build did not accept automated Control Hub OS upload from FTC Dev Tools.",
    suggestedActions: [
      "Use the opened Manage page: Select Update File → Update & Reboot.",
      "Or use the REV Hardware Client (recommended by REV).",
      "Keep 12V power connected for the entire update.",
    ],
  },
  {
    code: "HUB_UPDATE_FILE_MISSING",
    test: ({ text, codeHint }) =>
      codeHint === "HUB_UPDATE_FILE_MISSING" || /Missing OS package path|ENOENT/i.test(text),
    title: "Hub OS package file missing",
    summary: "The Control Hub OS zip was not found on disk.",
    suggestedActions: [
      "Run `ftc hub update download --yes` first.",
      "Or pass `--file` with a path to an official OS zip (do not unzip it).",
    ],
  },
  {
    code: "PEDRO_NETWORK",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_NETWORK" ||
      /Pedro FTC Maven metadata|Quickstart download failed|Failed to fetch Pedro/i.test(text),
    title: "Pedro Pathing network error",
    summary: "Could not reach Maven Central or the Pedro Quickstart GitHub release.",
    suggestedActions: [
      "Check internet connectivity.",
      "Retry later, or pass `--version` for `ftc pedro add` if metadata is temporarily unavailable.",
    ],
  },
  {
    code: "PEDRO_PROJECT_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_PROJECT_UNSUPPORTED" ||
      /build.dependencies.gradle missing|TeamCode missing|Not an official FTC/i.test(text),
    title: "Project not ready for Pedro Pathing",
    summary:
      "Pedro helpers require an official FTC project with TeamCode and build.dependencies.gradle.",
    suggestedActions: [
      "Open an official FtcRobotController-based project.",
      "Run `ftc doctor` to verify project detection.",
    ],
  },
  {
    code: "PEDRO_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_ABORTED" ||
      /Pedro add requires --yes|Pedro scaffold requires --yes/i.test(text),
    title: "Pedro Pathing change aborted",
    summary: "The Pedro Pathing change was not confirmed.",
    suggestedActions: ["Re-run with `--dry-run` to preview.", "Re-run with `--yes` to apply."],
  },
  {
    code: "PEDRO_DIRTY_TREE",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_DIRTY_TREE" ||
      /Refusing Pedro changes while the git working tree is dirty/i.test(text),
    title: "Git working tree is dirty",
    summary: "Refusing to modify the project while there are uncommitted changes.",
    suggestedActions: [
      "Commit or stash your changes.",
      "Or pass `--force` if you intentionally want to proceed.",
    ],
  },
  {
    code: "PEDRO_SCAFFOLD_EMPTY",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_SCAFFOLD_EMPTY" ||
      /pedroPathing package missing|No TeamCode\/\*\*\/pedroPathing/i.test(text),
    title: "Pedro scaffold source empty",
    summary: "Could not find a pedroPathing package inside the Quickstart archive.",
    suggestedActions: [
      "Retry with a newer Quickstart release tag.",
      "Or copy the pedroPathing package manually from https://github.com/Pedro-Pathing/Quickstart.",
    ],
  },
  {
    code: "PEDRO_URL_BLOCKED",
    test: ({ text, codeHint }) =>
      codeHint === "PEDRO_URL_BLOCKED" || /Unexpected Quickstart zipball/i.test(text),
    title: "Pedro download URL blocked",
    summary: "The Quickstart download URL was not an allowlisted Pedro-Pathing/Quickstart asset.",
    suggestedActions: ["Use the official Pedro Pathing Quickstart repository only."],
  },
  {
    code: "OPMODE_PROJECT_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "OPMODE_PROJECT_UNSUPPORTED" ||
      /No TeamCode source path|TeamCode missing/i.test(text),
    title: "Project not ready for OpModes",
    summary: "OpMode helpers require an official FTC project with a TeamCode module.",
    suggestedActions: [
      "Open an official FtcRobotController-based project root.",
      "Run `ftc doctor` to verify project detection.",
    ],
  },
  {
    code: "OPMODE_INVALID_NAME",
    test: ({ text, codeHint }) =>
      codeHint === "OPMODE_INVALID_NAME" || /Invalid Java class name/i.test(text),
    title: "Invalid OpMode class name",
    summary: "The OpMode class name must be a valid Java identifier.",
    suggestedActions: [
      "Use letters, digits, and underscores only.",
      "Start with a letter or underscore (e.g. MyTeleOp).",
    ],
  },
  {
    code: "OPMODE_EXISTS",
    test: ({ text, codeHint }) =>
      codeHint === "OPMODE_EXISTS" || /OpMode already exists/i.test(text),
    title: "OpMode already exists",
    summary: "An OpMode file with that class name already exists.",
    suggestedActions: [
      "Choose a different class name.",
      "Or pass `--force` to overwrite (a backup is created).",
    ],
  },
  {
    code: "OPMODE_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "OPMODE_ABORTED" || /OpMode create requires --yes/i.test(text),
    title: "OpMode create aborted",
    summary: "The OpMode was not created because confirmation was missing.",
    suggestedActions: [
      "Re-run with `--dry-run` to preview.",
      "Re-run with `--yes` to create the file.",
    ],
  },
  {
    code: "OPMODE_DIRTY_TREE",
    test: ({ text, codeHint }) =>
      codeHint === "OPMODE_DIRTY_TREE" ||
      /Refusing OpMode create while the git working tree is dirty/i.test(text),
    title: "Git working tree is dirty",
    summary: "Refusing to create an OpMode while there are uncommitted changes.",
    suggestedActions: [
      "Commit or stash your changes.",
      "Or pass `--force` if you intentionally want to proceed.",
    ],
  },
  {
    code: "CONFIG_PROJECT_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "CONFIG_PROJECT_UNSUPPORTED" || /Unsupported project layout/i.test(text),
    title: "Project not ready for robot configs",
    summary: "Robot config helpers require an official FTC project with TeamCode.",
    suggestedActions: [
      "Open an official FtcRobotController-based project root.",
      "Run `ftc doctor` to verify project detection.",
    ],
  },
  {
    code: "MISSING_CONFIG_NAME",
    test: ({ text, codeHint }) =>
      codeHint === "MISSING_CONFIG_NAME" || /Robot config name or path is required/i.test(text),
    title: "Robot config name required",
    summary: "A robot config base name or path must be provided.",
    suggestedActions: [
      "Run `ftc config list` to see available configs.",
      "Pass the config base name (e.g. my_robot) or a path under the project.",
    ],
  },
  {
    code: "CONFIG_NOT_FOUND",
    test: ({ text, codeHint }) =>
      codeHint === "CONFIG_NOT_FOUND" || /Robot config not found/i.test(text),
    title: "Robot config not found",
    summary: "No matching robot configuration XML was found under TeamCode/src/main/res/xml.",
    suggestedActions: [
      "Run `ftc config list` to see available configs.",
      "Or `ftc config pull --yes` to copy configs from a connected hub.",
    ],
  },
  {
    code: "CONFIG_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "CONFIG_ABORTED" || /Config pull requires --yes/i.test(text),
    title: "Robot config action aborted",
    summary: "The robot config change was not confirmed.",
    suggestedActions: ["Re-run with `--dry-run` to preview.", "Re-run with `--yes` to apply."],
  },
  {
    code: "CONFIG_REMOTE_EMPTY",
    test: ({ text, codeHint }) =>
      codeHint === "CONFIG_REMOTE_EMPTY" ||
      /No remote robot configs|No config XML found under/i.test(text),
    title: "No remote robot configs",
    summary: "The connected device has no XML configs under /sdcard/FIRST.",
    suggestedActions: [
      "Create a configuration on the Driver Station / Robot Controller first.",
      "Confirm the device serial with `ftc devices`.",
    ],
  },
  {
    code: "CONFIG_PULL_FAILED",
    test: ({ text, codeHint }) =>
      codeHint === "CONFIG_PULL_FAILED" ||
      /adb pull failed|Failed to list remote FIRST/i.test(text),
    title: "Robot config pull failed",
    summary: "adb could not list or pull configuration XML from the device.",
    suggestedActions: [
      "Confirm USB/wifi adb authorization.",
      "Retry `ftc config pull --device SERIAL --yes`.",
    ],
  },
  {
    code: "HWMAP_PROJECT_UNSUPPORTED",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_PROJECT_UNSUPPORTED" || /TeamCode missing/i.test(text),
    title: "Project not ready for hardware map",
    summary: "Hardware map helpers require an official FTC project with TeamCode.",
    suggestedActions: [
      "Open an official FtcRobotController-based project root.",
      "Run `ftc doctor` to verify project detection.",
    ],
  },
  {
    code: "HWMAP_NO_CONFIG",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_NO_CONFIG" || /No robot config XML found/i.test(text),
    title: "No robot config for hardware map",
    summary: "No robot configuration XML is available under TeamCode/src/main/res/xml.",
    suggestedActions: [
      "Run `ftc config list` or `ftc config pull --yes`.",
      "Then retry with `ftc hwmap show --config NAME`.",
    ],
  },
  {
    code: "HWMAP_CONFIG_AMBIGUOUS",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_CONFIG_AMBIGUOUS" || /Multiple robot configs found/i.test(text),
    title: "Multiple robot configs",
    summary: "More than one robot config XML exists; choose one explicitly.",
    suggestedActions: ["Pass `--config NAME` (see `ftc config list`)."],
  },
  {
    code: "HWMAP_EMPTY",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_EMPTY" || /No codegen-ready hardware map devices/i.test(text),
    title: "No codegen-ready devices",
    summary: "The selected config has no mapped actuators/sensors for hardwareMap stubs.",
    suggestedActions: [
      "Confirm the XML contains Motor/Servo/IMU/etc. entries.",
      "Run `ftc hwmap show --config NAME` to inspect mappings.",
    ],
  },
  {
    code: "HWMAP_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_ABORTED" || /Hardware map codegen requires --yes/i.test(text),
    title: "Hardware map codegen aborted",
    summary: "The OpMode was not generated because confirmation was missing.",
    suggestedActions: [
      "Re-run with `--dry-run` to preview.",
      "Re-run with `--yes` to write the OpMode.",
    ],
  },
  {
    code: "HWMAP_DIRTY_TREE",
    test: ({ text, codeHint }) =>
      codeHint === "HWMAP_DIRTY_TREE" ||
      /Refusing hwmap codegen while the git working tree is dirty/i.test(text),
    title: "Git working tree is dirty",
    summary: "Refusing to generate an OpMode while there are uncommitted changes.",
    suggestedActions: [
      "Commit or stash your changes.",
      "Or pass `--force` if you intentionally want to proceed.",
    ],
  },
  {
    code: "LIMELIGHT_HOST_AMBIGUOUS",
    test: ({ text, codeHint }) =>
      codeHint === "LIMELIGHT_HOST_AMBIGUOUS" ||
      /Multiple Limelight Vision hosts|Pass --host to select a camera/i.test(text),
    title: "Limelight Vision host ambiguous",
    summary: "More than one Limelight Vision host matches discovery and none was selected.",
    suggestedActions: [
      "Pass `--host <address>` to choose a camera.",
      "Set `vision.limelight.host` in `.ftc-dev.json` for a stable default.",
      "Run `ftc vision devices --json` to review discovered endpoints.",
    ],
  },
  {
    code: "LIMELIGHT_UNREACHABLE",
    test: ({ text, codeHint }) =>
      codeHint === "LIMELIGHT_UNREACHABLE" ||
      /Limelight Vision unreachable|returned non-JSON response/i.test(text),
    title: "Limelight Vision unreachable",
    summary: "Could not read status or results from the Limelight Vision HTTP API (port 5807).",
    suggestedActions: [
      "Confirm the camera is powered and on the same network as this computer.",
      "Open the Limelight Vision web UI at http://<host>:5801 to verify connectivity.",
      "Check team-number static IP or mDNS hostname settings if not using limelight.local.",
    ],
  },
  {
    code: "DASHBOARD_URL_AMBIGUOUS",
    test: ({ text, codeHint }) =>
      codeHint === "DASHBOARD_URL_AMBIGUOUS" ||
      /Multiple FTC Dashboard URLs|Pass --url or --host to select a dashboard/i.test(text),
    title: "FTC Dashboard URL ambiguous",
    summary: "More than one FTC Dashboard URL matches discovery and none was selected.",
    suggestedActions: [
      "Pass `--url <address>` or `--host <robot-ip>` to choose a dashboard.",
      "Set `vision.dashboard.url` in `.ftc-dev.json` for a stable default.",
      "Run `ftc vision devices --json` to review discovered endpoints.",
    ],
  },
  {
    code: "DASHBOARD_UNREACHABLE",
    test: ({ text, codeHint }) =>
      codeHint === "DASHBOARD_UNREACHABLE" ||
      /FTC Dashboard unreachable|Could not open browser automatically/i.test(text),
    title: "FTC Dashboard unreachable",
    summary: "Could not reach or open the FTC Dashboard URL.",
    suggestedActions: [
      "Confirm the robot is running and connected on the same network as this computer.",
      "Run `ftc vision dashboard status` to verify the resolved URL and reachability.",
      "Open the URL manually in a browser if automatic launch failed.",
    ],
  },
  {
    code: "BRIDGE_ABORTED",
    test: ({ text, codeHint }) =>
      codeHint === "BRIDGE_ABORTED" || /Bridge scaffold requires --yes/i.test(text),
    title: "Vision bridge scaffold cancelled",
    summary: "The vision diagnostic bridge scaffold requires explicit confirmation.",
    suggestedActions: [
      "Re-run with `--yes` if you intend to write bridge files into TeamCode.",
      "Use `--dry-run` to preview planned files without writing.",
    ],
  },
  {
    code: "BRIDGE_SCAFFOLD_EXISTS",
    test: ({ text, codeHint }) =>
      codeHint === "BRIDGE_SCAFFOLD_EXISTS" || /Bridge files already exist/i.test(text),
    title: "Vision bridge files already exist",
    summary: "Scaffold refused because diagnostic bridge files are already present.",
    suggestedActions: [
      "Run `ftc vision bridge status` to see existing paths.",
      "Pass `--force` only if you intend to overwrite generated bridge files.",
    ],
  },
  ...Object.values(VISION_DIAGNOSTIC_CODES).map((code) => ({
    code,
    test: ({ codeHint, text }: ErrorContext) =>
      codeHint === code || new RegExp(code.replace(/_/g, "[_ ]"), "i").test(text),
    ...FRIENDLY_BY_CODE[code],
  })),
];
export function interpretError(input: string | ErrorContext): FriendlyError {
  const ctx: ErrorContext = typeof input === "string" ? { text: input } : input;
  if (ctx.codeHint) {
    const exact = RULES.find((rule) => rule.code === ctx.codeHint);
    if (exact) {
      return {
        code: exact.code,
        title: exact.title,
        summary: exact.summary,
        suggestedActions: [...exact.suggestedActions],
        technicalDetails: ctx.text.slice(0, 4000) || undefined,
      };
    }
  }
  for (const rule of RULES) {
    if (rule.test(ctx)) {
      return {
        code: rule.code,
        title: rule.title,
        summary: rule.summary,
        suggestedActions: [...rule.suggestedActions],
        technicalDetails: ctx.text.slice(0, 4000) || undefined,
      };
    }
  }
  return {
    code: "UNKNOWN_ERROR",
    title: "Something went wrong",
    summary: "An unexpected error occurred. Technical details are included when available.",
    suggestedActions: [
      "Run the command again with verbose output if available.",
      "Run `ftc doctor` to check your environment.",
      "Search or open a GitHub issue with the technical details.",
    ],
    technicalDetails: ctx.text.slice(0, 4000) || undefined,
  };
}

export function interpretFromUnknown(error: unknown): FriendlyError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const codeHint = (error as { code: string }).code;
    const message = error instanceof Error ? error.message : String(error);
    const technical =
      "technicalDetails" in error &&
      typeof (error as { technicalDetails?: unknown }).technicalDetails === "string"
        ? (error as { technicalDetails: string }).technicalDetails
        : message;
    return interpretError({ text: technical, codeHint });
  }
  if (error instanceof Error) {
    return interpretError(error.message);
  }
  return interpretError(String(error));
}

export function listErrorRuleCodes(): string[] {
  return RULES.map((rule) => rule.code);
}
