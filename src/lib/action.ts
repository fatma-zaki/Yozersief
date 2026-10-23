import { isAppError, toAppError, ValidationError, type FieldErrors } from "./errors";
import { logger } from "./logger";
import type { Result } from "./result";

/** What a server action returns to the client: serialisable, no stack traces (brief A5). */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: unknown): ActionResult<never> {
  if (!isAppError(error)) logger.error("server action failed", { error });
  const appError = toAppError(error);
  return {
    ok: false,
    error: appError.userMessage,
    ...(appError instanceof ValidationError && Object.keys(appError.fieldErrors).length
      ? { fieldErrors: appError.fieldErrors }
      : {}),
  };
}

export function fromResult<T>(result: Result<T>): ActionResult<T> {
  return result.ok ? actionOk(result.value) : actionError(result.error);
}
