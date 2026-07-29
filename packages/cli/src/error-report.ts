import {
  buildCliErrorReportEnvironment,
  interpretFromUnknown,
  isAutoErrorReportEnabled,
  resolveGitHubReportToken,
  submitErrorReport,
} from "@ftc-dev-tools/shared";
import type { FriendlyError, ErrorReportSubmitResult } from "@ftc-dev-tools/shared";

export interface CliErrorReportContext {
  commandAttempted: string;
  deploySteps?: string[];
  forceReport?: boolean;
}

export async function maybeSubmitCliErrorReport(
  error: FriendlyError,
  context: CliErrorReportContext,
): Promise<ErrorReportSubmitResult | undefined> {
  const force = context.forceReport === true;
  if (!force && !isAutoErrorReportEnabled()) {
    return undefined;
  }

  const token = await resolveGitHubReportToken();
  if (!token) {
    if (force) {
      console.error(
        "\nCannot file error report: link GitHub with `ftc github link` or set GITHUB_TOKEN / GH_TOKEN.",
      );
    }
    return undefined;
  }

  try {
    const result = await submitErrorReport(
      {
        commandAttempted: context.commandAttempted,
        error,
        deploySteps: context.deploySteps,
        environment: buildCliErrorReportEnvironment(),
        occurredAt: new Date().toISOString(),
      },
      { token },
    );
    if (result.issueUrl) {
      const verb = result.action === "commented" ? "Updated" : "Created";
      console.error(`${verb} error report: ${result.commentUrl ?? result.issueUrl}`);
    }
    return result;
  } catch (reportError) {
    const friendly = interpretFromUnknown(reportError);
    console.error(`\nError report failed (${friendly.code}): ${friendly.summary}`);
    return undefined;
  }
}

export async function printFriendlyErrorWithOptionalReport(
  error: FriendlyError,
  showTechnical: boolean,
  report?: CliErrorReportContext,
): Promise<void> {
  console.error(`\n${error.title} (${error.code})`);
  console.error(error.summary);
  console.error("\nNext steps:");
  for (const action of error.suggestedActions) {
    console.error(`  - ${action}`);
  }
  if (showTechnical && error.technicalDetails) {
    console.error("\nTechnical details:");
    console.error(error.technicalDetails);
  } else if (error.technicalDetails) {
    console.error("\nRe-run with --verbose for technical details when available.");
  }

  if (report) {
    await maybeSubmitCliErrorReport(error, report);
  }
}
