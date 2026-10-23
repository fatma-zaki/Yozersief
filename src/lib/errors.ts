import { ar } from "@/i18n/ar";

export type AppErrorCode =
  | "not_found"
  | "forbidden"
  | "unauthorized"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "internal";

/**
 * Typed application error. `userMessage` is safe to show (Egyptian Arabic);
 * `message` is for logs only and must never reach the UI.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;

  constructor(
    code: AppErrorCode,
    httpStatus: number,
    userMessage: string,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message ?? code, options);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string, userMessage: string = ar.errors.notFound) {
    super("not_found", 404, userMessage, message);
  }
}

export class ForbiddenError extends AppError {
  readonly permission: string | undefined;

  constructor(permission?: string, userMessage: string = ar.errors.forbidden) {
    super(
      "forbidden",
      403,
      userMessage,
      permission ? `missing permission ${permission}` : undefined,
    );
    this.permission = permission;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super("unauthorized", 401, ar.errors.unauthorized, message);
  }
}

/** Staff session exists but global 2FA enrollment is required and not completed. */
export class TwoFactorRequiredError extends AppError {
  constructor(message = "two-factor enrollment required") {
    super("forbidden", 403, ar.errors.twoFactorRequired, message);
  }
}

export type FieldErrors = Record<string, string[]>;

export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors = {}, userMessage: string = ar.errors.validation) {
    super("validation", 422, userMessage);
    this.fieldErrors = fieldErrors;
  }
}

export class ConflictError extends AppError {
  constructor(message?: string, userMessage: string = ar.errors.conflict) {
    super("conflict", 409, userMessage, message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message?: string) {
    super("rate_limited", 429, ar.errors.rateLimited, message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Wraps anything thrown into an AppError without exposing the original message to users. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return new AppError("internal", 500, ar.errors.generic, "unexpected error", { cause: error });
}
