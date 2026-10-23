import "server-only";
import { AppError, ValidationError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";
import { ar } from "@/i18n/ar";
import { findOrderMatchingPhone } from "../infrastructure/tracking-repository";
import type { TrackingLookupInput } from "../schemas";

export type VerifyLookupResult = {
  orderId: string;
  ref: string;
};

/**
 * Verifies order ref + registered phone (knowledge factor only — not OTP-equivalent).
 * Always returns the same user-facing error on mismatch / missing order.
 */
export async function verifyTrackingLookup(
  input: TrackingLookupInput,
): Promise<Result<VerifyLookupResult>> {
  try {
    const match = await findOrderMatchingPhone(input.ref, input.phone);
    if (!match) {
      return err(
        new AppError("unauthorized", 401, ar.tracking.verifyFailed, "tracking lookup miss"),
      );
    }
    return ok(match);
  } catch (cause) {
    if (cause instanceof ValidationError) return err(cause);
    return err(
      new AppError("internal", 500, ar.errors.generic, "tracking lookup failed", { cause }),
    );
  }
}
