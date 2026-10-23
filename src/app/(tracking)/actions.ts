"use server";

import { headers } from "next/headers";
import { actionError, actionOk, type ActionResult } from "@/lib/action";
import { ValidationError } from "@/lib/errors";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import {
  clearTrackingSessionCookie,
  setTrackingSessionCookie,
  trackingLookupSchema,
  verifyTrackingLookup,
} from "@/modules/tracking";

export type VerifyTrackingActionData = { ref: string };

/**
 * Thin public action: Zod → rate limit (fail-closed) → verify ref+phone → signed cookie.
 * Never returns phone or order id to the client.
 */
export async function verifyTrackingAction(
  raw: unknown,
): Promise<ActionResult<VerifyTrackingActionData>> {
  try {
    const parsed = trackingLookupSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      throw new ValidationError(fieldErrors);
    }

    const h = await headers();
    const ip = clientIp(h);
    // Bound verification attempts per IP and per order ref (no phone in the key — avoid PII logs).
    await enforceRateLimit("tracking.lookup", `ip:${ip}`);
    await enforceRateLimit("tracking.lookup", `ref:${parsed.data.ref}`);

    const result = await verifyTrackingLookup(parsed.data);
    if (!result.ok) return actionError(result.error);

    await setTrackingSessionCookie(result.value.orderId);
    return actionOk({ ref: result.value.ref });
  } catch (error) {
    return actionError(error);
  }
}

/** Clears the order-scoped tracking cookie. */
export async function logoutTrackingAction(): Promise<ActionResult> {
  try {
    await clearTrackingSessionCookie();
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
