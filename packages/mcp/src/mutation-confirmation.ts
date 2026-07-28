import crypto from "node:crypto";

const PLAN_TTL_MS = 15 * 60 * 1000;

interface StoredMutationPlan {
  operation: string;
  projectRoot: string;
  payloadHash: string;
  createdAt: number;
  expiresAt: number;
}

const plans = new Map<string, StoredMutationPlan>();

export interface MutationConfirmation {
  planId: string;
  planHash: string;
  expiresAt: string;
  operation: string;
}

export function hashMutationPayload(
  operation: string,
  projectRoot: string,
  payload: unknown,
): string {
  const canonical = JSON.stringify({ operation, projectRoot, payload });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function issueMutationConfirmation(
  operation: string,
  projectRoot: string,
  payload: unknown,
): MutationConfirmation {
  const planId = crypto.randomUUID();
  const payloadHash = hashMutationPayload(operation, projectRoot, payload);
  const createdAt = Date.now();
  plans.set(planId, {
    operation,
    projectRoot: pathNormalize(projectRoot),
    payloadHash,
    createdAt,
    expiresAt: createdAt + PLAN_TTL_MS,
  });
  return {
    planId,
    planHash: payloadHash,
    expiresAt: new Date(createdAt + PLAN_TTL_MS).toISOString(),
    operation,
  };
}

export function consumeMutationConfirmation(options: {
  planId: string;
  planHash: string;
  operation: string;
  projectRoot: string;
  payload: unknown;
}): { ok: true } | { ok: false; message: string } {
  const stored = plans.get(options.planId);
  if (!stored) {
    return { ok: false, message: "Unknown or expired confirmation plan. Run dryRun preview again." };
  }
  plans.delete(options.planId);

  if (Date.now() > stored.expiresAt) {
    return { ok: false, message: "Confirmation plan expired. Run dryRun preview again." };
  }
  if (stored.operation !== options.operation) {
    return { ok: false, message: "Confirmation plan operation mismatch." };
  }
  if (stored.projectRoot !== pathNormalize(options.projectRoot)) {
    return { ok: false, message: "Confirmation plan project root mismatch." };
  }

  const expected = hashMutationPayload(options.operation, options.projectRoot, options.payload);
  if (stored.payloadHash !== expected || stored.payloadHash !== options.planHash) {
    return {
      ok: false,
      message:
        "Confirmation plan hash mismatch (inputs changed since preview). Run dryRun preview again.",
    };
  }

  return { ok: true };
}

function pathNormalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

/** @internal test helper */
export function clearMutationPlansForTests(): void {
  plans.clear();
}
