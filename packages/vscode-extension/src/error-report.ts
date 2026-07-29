import * as vscode from "vscode";
import {
  buildVscodeErrorReportEnvironment,
  interpretFromUnknown,
  submitErrorReport,
} from "@ftc-dev-tools/shared";
import type { FriendlyError, ErrorReportSubmitResult } from "@ftc-dev-tools/shared";

const GITHUB_SCOPES = ["public_repo", "read:user"];
const OPT_OUT_KEY = "ftc.githubErrorReportsOptOut";

let extensionVersion = "0.1.0";
let extensionContext: vscode.ExtensionContext | undefined;
let getActiveCommandAttempted: () => string | undefined = () => undefined;

export function initErrorReporting(deps: {
  context: vscode.ExtensionContext;
  extensionVersion: string;
  getActiveCommandAttempted: () => string | undefined;
}): void {
  extensionContext = deps.context;
  extensionVersion = deps.extensionVersion;
  getActiveCommandAttempted = deps.getActiveCommandAttempted;
}

export async function getLinkedGitHubSession(): Promise<
  { token: string; login: string } | undefined
> {
  if (extensionContext?.globalState.get<boolean>(OPT_OUT_KEY) === true) {
    return undefined;
  }
  const session = await vscode.authentication.getSession("github", GITHUB_SCOPES, {
    createIfNone: false,
  });
  if (!session) {
    return undefined;
  }
  return { token: session.accessToken, login: session.account.label };
}

export async function linkGitHubForErrorReportsCommand(): Promise<void> {
  await extensionContext?.globalState.update(OPT_OUT_KEY, false);
  const session = await vscode.authentication.getSession("github", GITHUB_SCOPES, {
    createIfNone: true,
  });
  if (!session) {
    vscode.window.showWarningMessage(
      "GitHub sign-in was cancelled. Install the GitHub Authentication extension if sign-in is unavailable.",
    );
    return;
  }
  vscode.window.showInformationMessage(
    `GitHub linked for error reports as @${session.account.label}. Failures can be reported to The-Allsparks/ftc-dev-tools.`,
  );
}

export async function unlinkGitHubForErrorReportsCommand(): Promise<void> {
  await extensionContext?.globalState.update(OPT_OUT_KEY, true);
  vscode.window.showInformationMessage(
    "GitHub error reports are disabled for FTC Dev Tools. Run “Link GitHub for error reports” to enable them again.",
  );
}

function isAutoReportEnabled(): boolean {
  return vscode.workspace.getConfiguration("ftc").get<boolean>("autoReportErrors", false);
}

export async function submitErrorReportForFriendlyError(input: {
  error: FriendlyError;
  commandAttempted?: string;
  deploySteps?: string[];
  forceReport?: boolean;
}): Promise<ErrorReportSubmitResult | undefined> {
  const linked = await getLinkedGitHubSession();
  if (!linked) {
    return { action: "skipped", reason: "not_linked" };
  }

  const auto = isAutoReportEnabled();
  if (!auto && !input.forceReport) {
    return { action: "skipped", reason: "not_requested" };
  }

  const commandAttempted =
    input.commandAttempted?.trim() || getActiveCommandAttempted()?.trim() || "ftc.command";

  try {
    return await submitErrorReport(
      {
        commandAttempted,
        error: input.error,
        reporterLogin: linked.login,
        deploySteps: input.deploySteps,
        environment: buildVscodeErrorReportEnvironment(extensionVersion),
        occurredAt: new Date().toISOString(),
      },
      { token: linked.token },
    );
  } catch (error) {
    const friendly = interpretFromUnknown(error);
    vscode.window.showErrorMessage(
      `Could not submit error report: ${friendly.summary}`,
    );
    return { action: "skipped", reason: friendly.code };
  }
}

export async function offerErrorReportActions(input: {
  error: FriendlyError;
  commandAttempted?: string;
  deploySteps?: string[];
  onOpenTechnicalOutput?: () => void;
  onShowNextSteps?: () => void;
}): Promise<void> {
  const linked = await getLinkedGitHubSession();
  const auto = isAutoReportEnabled();

  if (linked && auto) {
    const result = await submitErrorReportForFriendlyError({
      ...input,
      forceReport: true,
    });
    if (result?.action === "created" && result.issueUrl) {
      const open = await vscode.window.showInformationMessage(
        `${input.error.title}: ${input.error.summary}`,
        "Open issue",
        "Dismiss",
      );
      if (open === "Open issue") {
        await vscode.env.openExternal(vscode.Uri.parse(result.issueUrl));
      }
      return;
    }
    if (result?.action === "commented" && result.issueUrl) {
      const open = await vscode.window.showInformationMessage(
        `${input.error.title}: ${input.error.summary} (occurrence added to existing report)`,
        "Open issue",
        "Dismiss",
      );
      if (open === "Open issue") {
        await vscode.env.openExternal(vscode.Uri.parse(result.commentUrl ?? result.issueUrl));
      }
      return;
    }
  }

  const choices = ["Open Technical Output", "Show Next Steps"];
  if (linked) {
    choices.push("Report to maintainers");
  } else {
    choices.push("Link GitHub to report");
  }

  const action = await vscode.window.showErrorMessage(
    `${input.error.title}: ${input.error.summary}`,
    ...choices,
  );

  if (action === "Open Technical Output") {
    input.onOpenTechnicalOutput?.();
    return;
  }
  if (action === "Show Next Steps") {
    input.onShowNextSteps?.();
    return;
  }

  if (action === "Link GitHub to report") {
    await linkGitHubForErrorReportsCommand();
    const afterLink = await getLinkedGitHubSession();
    if (afterLink) {
      await offerErrorReportActions(input);
    }
    return;
  }

  if (action === "Report to maintainers") {
    const result = await submitErrorReportForFriendlyError({
      ...input,
      forceReport: true,
    });
    if (result?.issueUrl) {
      const label =
        result.action === "commented"
          ? "Added occurrence to existing issue."
          : "Created new error report issue.";
      const open = await vscode.window.showInformationMessage(label, "Open issue");
      if (open === "Open issue") {
        await vscode.env.openExternal(
          vscode.Uri.parse(result.commentUrl ?? result.issueUrl),
        );
      }
    }
  }
}

export function formatErrorForOutput(error: FriendlyError): string {
  const lines = [
    `${error.title} (${error.code})`,
    error.summary,
    ...error.suggestedActions.map((action) => `- ${action}`),
  ];
  if (error.technicalDetails) {
    lines.push("Technical details:", error.technicalDetails);
  }
  return lines.join("\n");
}
