import type { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  clearGitHubReportToken,
  isAutoErrorReportEnabled,
  loadGitHubReportToken,
  resolveGitHubReportToken,
  storeGitHubReportToken,
} from "@ftc-dev-tools/shared";
import type { FetchLike } from "@ftc-dev-tools/shared";

async function fetchGitHubLogin(token: string): Promise<string | undefined> {
  const fetchImpl = globalThis.fetch as FetchLike;
  const response = await fetchImpl("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "ftc-dev-tools-cli",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    return undefined;
  }
  const data = (await response.json()) as { login?: string };
  return data.login;
}

export function registerGitHubCommand(program: Command): void {
  const github = program.command("github").description("Link GitHub to file error reports to FTC Dev Tools");

  github
    .command("link")
    .description("Store a GitHub token for automated error reports (or use GITHUB_TOKEN / GH_TOKEN)")
    .option("--token <pat>", "Personal access token with public_repo scope (avoid shell history when possible)")
    .action(async (options: { token?: string }) => {
      let token = options.token?.trim() || process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
      if (!token) {
        const rl = readline.createInterface({ input, output });
        token = (await rl.question("GitHub personal access token (public_repo): ")).trim();
        rl.close();
      }
      if (!token) {
        console.error("No token provided.");
        process.exitCode = 1;
        return;
      }
      const login = await fetchGitHubLogin(token);
      if (!login) {
        console.error("Token could not access GitHub API. Check scopes (public_repo) and try again.");
        process.exitCode = 1;
        return;
      }
      await storeGitHubReportToken(token);
      console.log(`Linked GitHub for error reports as @${login}.`);
      console.log("Set FTC_AUTO_ERROR_REPORT=1 to report on failures, or pass --report on supported commands.");
    });

  github
    .command("status")
    .description("Show whether GitHub error reporting is linked")
    .action(async () => {
      const token = await resolveGitHubReportToken();
      if (!token) {
        console.log("Not linked. Run: ftc github link");
        return;
      }
      const login = await fetchGitHubLogin(token);
      console.log(login ? `Linked as @${login}` : "Token stored but GitHub API check failed.");
      console.log(
        isAutoErrorReportEnabled()
          ? "FTC_AUTO_ERROR_REPORT is enabled."
          : "FTC_AUTO_ERROR_REPORT is off (use --report on failures or enable the env var).",
      );
    });

  github
    .command("unlink")
    .description("Remove stored GitHub token from this machine")
    .action(async () => {
      const had = await loadGitHubReportToken();
      await clearGitHubReportToken();
      console.log(had ? "Removed stored GitHub token." : "No stored token was found.");
    });
}
