"use server";

import { headers } from "next/headers";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { ValidationError } from "@/lib/errors";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import { submitOrder } from "@/modules/orders";
import { submitOrderInputSchema } from "@/modules/orders/schemas";

export type SubmitOrderActionData = { ref: string };

/**
 * Thin public action: Zod parse → rate limit → submitOrder (brief A3, A5, B5).
 * Anonymous customers are supported; no staff session required.
 */
export async function submitOrderAction(
  raw: unknown,
): Promise<ActionResult<SubmitOrderActionData>> {
  try {
    const parsed = submitOrderInputSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      throw new ValidationError(fieldErrors);
    }

    const h = await headers();
    await enforceRateLimit("order.submit", clientIp(h));

    return fromResult(await submitOrder(parsed.data));
  } catch (error) {
    return actionError(error);
  }
}
