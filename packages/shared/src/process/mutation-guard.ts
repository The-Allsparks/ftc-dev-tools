import { interpretFromUnknown } from "../errors/interpret.js";
import type { FriendlyError } from "../types/errors.js";

export interface MutationRefusal {
  message: string;
  error: FriendlyError;
}

/** Structured refusal when a mutating command runs without `--yes`. */
export function refuseMutationWithoutYes(options: {
  actionDescription: string;
  code: string;
}): MutationRefusal {
  const errorMessage = `${options.actionDescription} requires --yes.`;
  return {
    message: `Refusing to ${options.actionDescription} without --yes.`,
    error: interpretFromUnknown(
      Object.assign(new Error(errorMessage), { code: options.code }),
    ),
  };
}
