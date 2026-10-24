"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  advanceOrderStage,
  decideOrder,
  saveInternalNote,
  type StaffActionResult,
} from "@/modules/orders";
import type {
  AdvanceStageInput,
  DecideOrderInput,
  InternalNoteInput,
} from "@/modules/orders/schemas";

/** Orders → «موافقة» / «طلب بيانات من العميل» / «رفض» (brief B7). */
export async function decideOrderAction(
  input: DecideOrderInput,
): Promise<ActionResult<StaffActionResult>> {
  try {
    const staff = await requirePermission("orders.view");
    const result = await decideOrder(staff, input);
    if (result.ok) revalidatePath("/dashboard/orders");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Orders → «سجّل المرحلة الجاية» on a business order. */
export async function advanceStageAction(
  input: AdvanceStageInput,
): Promise<ActionResult<StaffActionResult & { label: string }>> {
  try {
    const staff = await requirePermission("orders.view");
    const result = await advanceOrderStage(staff, input);
    if (result.ok) revalidatePath("/dashboard/orders");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Orders → «ملاحظة داخلية» (saved when the field loses focus). */
export async function saveInternalNoteAction(
  input: InternalNoteInput,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const staff = await requirePermission("orders.request_info");
    return fromResult(await saveInternalNote(staff, input));
  } catch (error) {
    return actionError(error);
  }
}
