import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  consumeMutationConfirmation,
  issueMutationConfirmation,
  type MutationConfirmation,
} from "./mutation-confirmation.js";
import { jsonResult } from "./result.js";

export interface MutationConfirmArgs {
  dryRun?: boolean;
  yes?: boolean;
  confirmPlanId?: string;
  confirmPlanHash?: string;
}

export type MutationGateResult =
  { allowed: true; dryRun: boolean } | { allowed: false; result: CallToolResult };

export function gateMutation(
  args: MutationConfirmArgs,
  operation: string,
  projectRoot: string,
  payload: unknown,
  previewMessage: string,
): MutationGateResult {
  if (args.dryRun === true) {
    return { allowed: true, dryRun: true };
  }

  if (args.confirmPlanId && args.confirmPlanHash) {
    const consumed = consumeMutationConfirmation({
      planId: args.confirmPlanId,
      planHash: args.confirmPlanHash,
      operation,
      projectRoot,
      payload,
    });
    if (!consumed.ok) {
      return {
        allowed: false,
        result: jsonResult(
          {
            success: false,
            code: "CONFIRMATION_INVALID",
            message: consumed.message,
          },
          true,
        ),
      };
    }
    return { allowed: true, dryRun: false };
  }

  const confirmation: MutationConfirmation = issueMutationConfirmation(
    operation,
    projectRoot,
    payload,
  );
  return {
    allowed: false,
    result: jsonResult(
      {
        success: false,
        code: "CONFIRMATION_REQUIRED",
        message: `${previewMessage} Call again with confirmPlanId and confirmPlanHash from this response (yes=true alone is not accepted).`,
        confirmation,
      },
      true,
    ),
  };
}

export function attachConfirmation(
  data: Record<string, unknown>,
  operation: string,
  projectRoot: string,
  payload: unknown,
): Record<string, unknown> {
  if (data.dryRun === true) {
    return {
      ...data,
      confirmation: issueMutationConfirmation(operation, projectRoot, payload),
    };
  }
  return data;
}

export async function runGatedMutation<T extends Record<string, unknown>>(
  args: MutationConfirmArgs,
  operation: string,
  projectRoot: string,
  payload: unknown,
  previewMessage: string,
  execute: (dryRun: boolean) => Promise<T>,
): Promise<CallToolResult> {
  const gate = gateMutation(args, operation, projectRoot, payload, previewMessage);
  if (!gate.allowed) {
    return gate.result;
  }
  const result = await execute(gate.dryRun);
  const body = { ...result, projectRoot };
  if (gate.dryRun) {
    return jsonResult(
      attachConfirmation(body, operation, projectRoot, payload),
      body.success === false,
    );
  }
  return jsonResult(body, body.success === false);
}
