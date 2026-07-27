import type { Command } from "commander";
import {
  connectWifiAdb,
  disconnectWifiAdb,
  enableTcpip,
  ensureRobotRoute,
  findInterfaceByNameOrIndex,
  getHubWifiSettings,
  getWifiStatus,
  joinRobotWifi,
  listNetworkInterfaces,
  openRobotConsole,
  preferInternetInterface,
  preferRobotInterface,
  removeRobotRoute,
  setAdapterAdminState,
  setHubWifiSettings,
  setRobotNetworkInterface,
} from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

async function readPasswordFromStdinPrompt(): Promise<string | undefined> {
  if (!process.stdin.isTTY) {
    return undefined;
  }
  process.stdout.write("Hub Wi-Fi password (input hidden not guaranteed in all terminals): ");
  return await new Promise((resolve) => {
    const onData = (chunk: Buffer): void => {
      process.stdin.off("data", onData);
      process.stdin.pause();
      resolve(chunk.toString("utf8").trim() || undefined);
    };
    process.stdin.resume();
    process.stdin.once("data", onData);
  });
}

export function registerWifiCommand(program: Command): void {
  const wifi = program
    .command("wifi")
    .description(
      "Wireless Control Hub adb, dual-NIC routing, and Robot Controller Console helpers",
    );

  wifi
    .command("status")
    .description("Show Wi-Fi adb, console reachability, and robot network interface status")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { json?: boolean; verbose?: boolean }) => {
      const ctx = createCliContext(process.cwd(), options.verbose === true);
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }
      const report = await getWifiStatus({
        runner: ctx.runner,
        deviceProvider,
      });
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log("FTC Wi-Fi Status\n");
        console.log(
          `Console: ${report.console.reachable ? "reachable" : "unreachable"} (${report.console.url})`,
        );
        console.log(
          `Route:   ${report.robotRoutePresent ? "present" : "not present"} for hub subnet`,
        );
        if (report.selectedInterface) {
          console.log(
            `Robot NIC: ${report.selectedInterface.name}${report.selectedInterface.index !== undefined ? ` (#${report.selectedInterface.index})` : ""}`,
          );
        } else {
          console.log("Robot NIC: (not selected — run `ftc wifi use-interface`)");
        }
        if (report.wifiAdbDevices.length > 0) {
          console.log(`Wi-Fi adb: ${report.wifiAdbDevices.join(", ")}`);
        }
        console.log(`\n${report.message}`);
      }
    });

  wifi
    .command("interfaces")
    .description("List network interfaces (for dual-NIC robot vs internet setup)")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      const interfaces = await listNetworkInterfaces({ runner: ctx.runner });
      if (options.json) {
        console.log(JSON.stringify({ interfaces }, null, 2));
      } else {
        console.log("Network interfaces\n");
        for (const iface of interfaces) {
          const idx = iface.index !== undefined ? `#${iface.index} ` : "";
          console.log(`${idx}${iface.name} — ${iface.state}`);
        }
      }
    });

  wifi
    .command("use-interface")
    .description("Select which network interface carries Control Hub / robot traffic")
    .argument("<name-or-index>", "Interface name or index from `ftc wifi interfaces`")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (selector: string, options: { json?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      const interfaces = await listNetworkInterfaces({ runner: ctx.runner });
      const hit = findInterfaceByNameOrIndex(interfaces, selector);
      if (!hit) {
        console.error(`Interface not found: ${selector}`);
        process.exitCode = 1;
        return;
      }
      const selected = await setRobotNetworkInterface({ name: hit.name, index: hit.index });
      const payload = { selected, path: "machine-local wifi preference" };
      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log(
          `Robot network interface set to ${selected.name}${selected.index !== undefined ? ` (#${selected.index})` : ""}.`,
        );
        console.log(
          "Join the Control Hub SSID on this adapter in your OS, then run `ftc wifi route ensure --yes`.",
        );
      }
    });

  const route = wifi.command("route").description("Manage robot-subnet routes for dual-NIC setups");

  route
    .command("ensure")
    .description("Add a route for the Control Hub subnet via the selected robot interface")
    .option("--subnet <cidr>", "Destination CIDR", "192.168.43.0/24")
    .option("--yes", "Apply the route change")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: { subnet?: string; yes?: boolean; json?: boolean; verbose?: boolean }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const result = await ensureRobotRoute({
          runner: ctx.runner,
          destinationCidr: options.subnet,
          yes: options.yes === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          console.log(`Plan: ${result.plan.commandDisplay}`);
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  route
    .command("remove")
    .description("Remove the Control Hub subnet route added by ftc wifi route ensure")
    .option("--subnet <cidr>", "Destination CIDR", "192.168.43.0/24")
    .option("--yes", "Apply the route removal")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: { subnet?: string; yes?: boolean; json?: boolean; verbose?: boolean }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const result = await removeRobotRoute({
          runner: ctx.runner,
          destinationCidr: options.subnet,
          yes: options.yes === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  wifi
    .command("connect")
    .description("Connect wireless adb to the Control Hub (default 192.168.43.1:5555)")
    .argument("[host[:port]]", "adb endpoint", "192.168.43.1:5555")
    .option("--yes", "Confirm route ensure when a robot interface is selected")
    .option("--no-route", "Skip robot-subnet route ensure")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        endpoint: string,
        options: { yes?: boolean; noRoute?: boolean; json?: boolean; verbose?: boolean },
      ) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const result = await connectWifiAdb({
          runner: ctx.runner,
          endpoint,
          yes: options.yes === true,
          ensureRoute: options.noRoute !== true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.routeResult) {
            console.log(`Route: ${result.routeResult.message}`);
          }
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  wifi
    .command("disconnect")
    .description("Disconnect wireless adb endpoint(s)")
    .argument("[host[:port]]", "adb endpoint to disconnect")
    .option("--all", "Disconnect all wireless adb endpoints")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (endpoint: string | undefined, options: { all?: boolean; json?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      const result = await disconnectWifiAdb({
        runner: ctx.runner,
        endpoint: options.all ? undefined : endpoint,
        disconnectAll: options.all === true,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
      }
      process.exitCode = result.success ? 0 : 1;
    });

  wifi
    .command("enable-tcpip")
    .description("Switch a USB-connected Android device to wireless adb mode")
    .option("--device <serial>", "USB device serial")
    .option("--port <port>", "TCP port", "5555")
    .option("--yes", "Confirm tcpip mode change")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { device?: string; port?: string; yes?: boolean; json?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      try {
        const result = await enableTcpip({
          runner: ctx.runner,
          deviceSerial: options.device,
          port: Number.parseInt(options.port ?? "5555", 10),
          yes: options.yes === true,
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
        }
        process.exitCode = result.success ? 0 : 1;
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ success: false, message: String(error) }, null, 2));
        } else {
          console.error(String(error));
        }
        process.exitCode = 1;
      }
    });

  wifi
    .command("open-console")
    .description("Open the Robot Controller Console in the system browser")
    .option("--url <url>", "Console URL", "http://192.168.43.1:8080")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { url?: string; json?: boolean }) => {
      const ctx = createCliContext(process.cwd());
      const result = await openRobotConsole(ctx.runner, options.url);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
      }
    });

  wifi
    .command("join")
    .description("Join a Control Hub SSID on the selected robot network interface")
    .requiredOption("--ssid <name>", "Wi-Fi network name (SSID)")
    .option("--interface <name>", "Network interface (defaults to selected robot NIC)")
    .option("--password-env <VAR>", "Env var holding the password", "FTC_WIFI_PASSWORD")
    .option("--no-remember", "Do not store the password in the machine-local secret file")
    .option("--yes", "Confirm joining the network")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        ssid: string;
        interface?: string;
        passwordEnv?: string;
        remember?: boolean;
        yes?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const envName = options.passwordEnv ?? "FTC_WIFI_PASSWORD";
        let password = process.env[envName];
        if (!password && process.stdin.isTTY && !options.json) {
          password = await readPasswordFromStdinPrompt();
        }
        const result = await joinRobotWifi({
          runner: ctx.runner,
          ssid: options.ssid,
          password,
          interfaceName: options.interface,
          passwordEnvVar: envName,
          remember: options.remember !== false,
          yes: options.yes === true,
        });
        if (options.json) {
          const safe = {
            ...result,
            error: result.error
              ? { ...result.error, technicalDetails: result.error.technicalDetails }
              : undefined,
          };
          console.log(JSON.stringify(safe, null, 2));
        } else {
          console.log(result.message);
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  const manage = wifi
    .command("manage")
    .description("Read or apply Control Hub Wi-Fi settings via Robot Controller Console");

  manage
    .command("get")
    .description("Read current hub Wi-Fi settings from the Robot Controller Console")
    .option("--url <url>", "Console base URL", "http://192.168.43.1:8080")
    .option("--json", "Emit stable machine-readable JSON (password never included)")
    .option("--verbose", "Include technical details for failures")
    .action(async (options: { url?: string; json?: boolean; verbose?: boolean }) => {
      const result = await getHubWifiSettings({ baseUrl: options.url });
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: result.success,
              message: result.message,
              settings: result.publicSettings,
              error: result.error,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(result.message);
        if (result.publicSettings) {
          console.log(`SSID:    ${result.publicSettings.ssid ?? "(unknown)"}`);
          console.log(
            `Password:${result.publicSettings.passwordSet ? " (set — not printed)" : " (unknown)"}`,
          );
          console.log(`Band:    ${result.publicSettings.band ?? "(unknown)"}`);
          console.log(`Channel: ${result.publicSettings.channel ?? "(unknown)"}`);
        }
        if (result.error) {
          printFriendlyError(result.error, options.verbose === true);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });

  manage
    .command("set")
    .description("Apply hub Wi-Fi SSID/password/band/channel (disconnects clients)")
    .option("--ssid <name>", "New access point name")
    .option("--password-env <VAR>", "Env var holding the new password")
    .option("--band <band>", "Wi-Fi band (for example 2.4GHz or 5GHz)")
    .option("--channel <channel>", "Wi-Fi channel")
    .option("--url <url>", "Console base URL", "http://192.168.43.1:8080")
    .option("--dry-run", "Show planned apply without POSTing")
    .option("--yes", "Confirm apply (required for real changes)")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (options: {
        ssid?: string;
        passwordEnv?: string;
        band?: string;
        channel?: string;
        url?: string;
        dryRun?: boolean;
        yes?: boolean;
        json?: boolean;
        verbose?: boolean;
      }) => {
        const password = options.passwordEnv ? process.env[options.passwordEnv] : undefined;
        if (options.passwordEnv && !password) {
          console.error(`Environment variable ${options.passwordEnv} is empty or unset.`);
          process.exitCode = 1;
          return;
        }
        const result = await setHubWifiSettings({
          baseUrl: options.url,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
          input: {
            ssid: options.ssid,
            password,
            band: options.band,
            channel: options.channel,
          },
        });
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.message);
          if (result.error) {
            printFriendlyError(result.error, options.verbose === true);
          }
        }
        process.exitCode = result.success ? 0 : 1;
      },
    );

  wifi
    .command("prefer-internet")
    .description(
      "Prefer an interface for internet (lower metric); keep hub traffic on robot subnet route",
    )
    .argument("<name-or-index>", "Internet network interface name or index")
    .option("--robot <name>", "Robot NIC to deprioritize (defaults to selected robot interface)")
    .option("--internet-metric <n>", "Metric for internet NIC", "10")
    .option("--robot-metric <n>", "Metric for robot NIC", "50")
    .option("--adjust-gateway", "Acknowledge gateway note (Phase 3 does not remove gateways)")
    .option("--dry-run", "Show planned metric changes without applying")
    .option("--yes", "Apply metric changes")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        selector: string,
        options: {
          robot?: string;
          internetMetric?: string;
          robotMetric?: string;
          adjustGateway?: boolean;
          dryRun?: boolean;
          yes?: boolean;
          json?: boolean;
          verbose?: boolean;
        },
      ) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const result = await preferInternetInterface({
          runner: ctx.runner,
          interfaceName: selector,
          robotInterfaceName: options.robot,
          internetMetric: Number.parseInt(options.internetMetric ?? "10", 10),
          robotMetric: Number.parseInt(options.robotMetric ?? "50", 10),
          adjustGateway: options.adjustGateway === true,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
        });
        printPreferResult(result, options.json === true, options.verbose === true);
        process.exitCode = result.success ? 0 : 1;
      },
    );

  wifi
    .command("prefer-robot")
    .description("Prefer robot NIC for hub subnet (route ensure + secondary metric)")
    .argument("[name-or-index]", "Robot interface (defaults to selected robot NIC)")
    .option("--robot-metric <n>", "Metric for robot NIC", "50")
    .option("--no-route", "Skip hub subnet route ensure")
    .option("--dry-run", "Show planned changes without applying")
    .option("--yes", "Apply changes")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        selector: string | undefined,
        options: {
          robotMetric?: string;
          noRoute?: boolean;
          dryRun?: boolean;
          yes?: boolean;
          json?: boolean;
          verbose?: boolean;
        },
      ) => {
        const ctx = createCliContext(process.cwd(), options.verbose === true);
        const result = await preferRobotInterface({
          runner: ctx.runner,
          interfaceName: selector,
          robotMetric: Number.parseInt(options.robotMetric ?? "50", 10),
          ensureRoute: options.noRoute !== true,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
        });
        printPreferResult(result, options.json === true, options.verbose === true);
        process.exitCode = result.success ? 0 : 1;
      },
    );

  const adapter = wifi
    .command("adapter")
    .description("Enable or disable a network adapter (explicit; refuses last-up disable)");

  adapter
    .command("enable")
    .description("Enable a network adapter")
    .argument("<name-or-index>", "Adapter name or index")
    .option("--dry-run", "Show planned change without applying")
    .option("--yes", "Apply the change")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        selector: string,
        options: { dryRun?: boolean; yes?: boolean; json?: boolean; verbose?: boolean },
      ) => {
        await runAdapterCommand(selector, "enable", options);
      },
    );

  adapter
    .command("disable")
    .description("Disable a network adapter")
    .argument("<name-or-index>", "Adapter name or index")
    .option("--force", "Allow disabling the last up non-loopback interface")
    .option("--dry-run", "Show planned change without applying")
    .option("--yes", "Apply the change")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--verbose", "Include technical details for failures")
    .action(
      async (
        selector: string,
        options: {
          force?: boolean;
          dryRun?: boolean;
          yes?: boolean;
          json?: boolean;
          verbose?: boolean;
        },
      ) => {
        await runAdapterCommand(selector, "disable", options);
      },
    );
}

function printPreferResult(
  result: {
    success: boolean;
    message: string;
    planLines: string[];
    error?: {
      title: string;
      summary: string;
      suggestedActions: string[];
      technicalDetails?: string;
      code: string;
    };
  },
  json: boolean,
  verbose: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.message);
  if (result.planLines.length > 0) {
    console.log("\nPlan:");
    for (const line of result.planLines) {
      console.log(`  - ${line}`);
    }
  }
  if (result.error) {
    printFriendlyError(result.error, verbose);
  }
}

async function runAdapterCommand(
  selector: string,
  action: "enable" | "disable",
  options: { force?: boolean; dryRun?: boolean; yes?: boolean; json?: boolean; verbose?: boolean },
): Promise<void> {
  const ctx = createCliContext(process.cwd(), options.verbose === true);
  const result = await setAdapterAdminState({
    runner: ctx.runner,
    interfaceName: selector,
    action,
    force: options.force === true,
    dryRun: options.dryRun === true,
    yes: options.yes === true,
  });
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.message);
    for (const line of result.planLines) {
      console.log(`  - ${line}`);
    }
    if (result.error) {
      printFriendlyError(result.error, options.verbose === true);
    }
  }
  process.exitCode = result.success ? 0 : 1;
}
