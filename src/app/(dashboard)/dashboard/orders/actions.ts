"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  advanceOrderStage,
  cancelOrder,
  decideOrder,
  editOrder,
  saveInternalNote,
  type StaffActionResult,
} from "@/modules/orders";
import type {
  AdvanceStageInput,
  CancelOrderInput,
  DecideOrderInput,
  EditOrderInput,
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

/** Orders → «سجّل المرحلة التالية» (the next step after approval). */
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

/** Orders → «إلغاء الطلب» (admin and desk by default; `orders.cancel` in the role matrix). */
export async function cancelOrderAction(
  input: CancelOrderInput,
): Promise<ActionResult<StaffActionResult>> {
  try {
    const staff = await requirePermission("orders.cancel");
    const result = await cancelOrder(staff, input);
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

/** Orders → «تعديل الطلب» (admin by default; `orders.edit` in the role matrix). */
export async function editOrderAction(
  input: EditOrderInput,
): Promise<ActionResult<{ ref: string; changed: string[] }>> {
  try {
    const staff = await requirePermission("orders.edit");
    const result = await editOrder(staff, input);
    if (result.ok) revalidatePath("/dashboard/orders");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}
