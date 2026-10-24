"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/ratelimit";
import { confirmHandover, recordPayment, type HandoverResult } from "@/modules/orders";
import type { HandoverInput, RecordPaymentInput } from "@/modules/orders/schemas";

/** Delivery → «تأكيد التسليم» (last 3 phone digits). */
export async function confirmHandoverAction(
  input: HandoverInput,
): Promise<ActionResult<HandoverResult>> {
  try {
    const staff = await requirePermission("delivery.handover");
    await enforceRateLimit("delivery.handover", staff.id);
    const result = await confirmHandover(staff, input);
    if (result.ok) revalidatePath("/dashboard/delivery");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Delivery → «سجّل الدفعة». */
export async function recordPaymentAction(
  input: RecordPaymentInput,
): Promise<ActionResult<{ ref: string }>> {
  try {
    const staff = await requirePermission("payments.record");
    const result = await recordPayment(staff, input);
    if (result.ok) revalidatePath("/dashboard/delivery");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}
