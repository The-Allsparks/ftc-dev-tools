import {
  buildMcpErrorReportEnvironment,
  interpretFromUnknown,
  isAutoErrorReportEnabled,
  resolveGitHubReportToken,
  submitErrorReport,
} from "@ftc-dev-tools/shared";
import type { FriendlyError } from "@ftc-dev-tools/shared";

export async function maybeReportMcpToolError(input: {
  toolName: string;
  error: FriendlyError;
  deploySteps?: string[];
}): Promise<{ reported: boolean; issueUrl?: string }> {
  if (!isAutoErrorReportEnabled()) {
    return { reported: false };
  }
  const token = await resolveGitHubReportToken();
  if (!token) {
    return { reported: false };
  }
  try {
    const result = await submitErrorReport(
      {
        commandAttempted: `mcp:${input.toolName}`,
        error: input.error,
        deploySteps: input.deploySteps,
        environment: buildMcpErrorReportEnvironment(),
        occurredAt: new Date().toISOString(),
      },
      { token },
    );
    return { reported: true, issueUrl: result.commentUrl ?? result.issueUrl };
  } catch (error) {
    interpretFromUnknown(error);
    return { reported: false };
  }
}
