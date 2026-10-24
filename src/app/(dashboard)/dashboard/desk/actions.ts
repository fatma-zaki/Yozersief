"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  customerWhatsappLink,
  decideOrder,
  draftQuote,
  forwardToAdmin,
  recordMockupDecision,
  sendMockupToCustomer,
  type DeskActionResult,
  type StaffActionResult,
} from "@/modules/orders";
import type { DeskOrderInput, DeskQuoteInput, MockupDecisionInput } from "@/modules/orders/schemas";

/** Desk → «ابعت للمدير للاعتماد» (quote draft). */
export async function draftQuoteAction(
  input: DeskQuoteInput,
): Promise<ActionResult<DeskActionResult>> {
  try {
    const staff = await requirePermission("quotes.draft");
    const result = await draftQuote(staff, input);
    if (result.ok) revalidatePath("/dashboard/desk");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Desk → «حوّل للمدير للموافقة». */
export async function forwardToAdminAction(
  input: DeskOrderInput,
): Promise<ActionResult<DeskActionResult>> {
  try {
    const staff = await requirePermission("orders.request_info");
    const result = await forwardToAdmin(staff, input);
    if (result.ok) revalidatePath("/dashboard/desk");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Desk → «طلب بيانات من العميل» (the same decision the admin's orders screen runs). */
export async function requestInfoAction(input: {
  orderId: string;
  text: string;
}): Promise<ActionResult<StaffActionResult>> {
  try {
    const staff = await requirePermission("orders.request_info");
    const result = await decideOrder(staff, { ...input, decision: "info" });
    if (result.ok) revalidatePath("/dashboard/desk");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Desk → «واتساب العميل» (logged: the link carries the phone). */
export async function customerWhatsappAction(
  input: DeskOrderInput,
): Promise<ActionResult<{ waLink: string }>> {
  try {
    const staff = await requirePermission("customers.view_phone");
    return fromResult(await customerWhatsappLink(staff, input));
  } catch (error) {
    return actionError(error);
  }
}

/** Desk → «ابعت الموكاب للعميل». */
export async function sendMockupAction(
  input: DeskOrderInput,
): Promise<ActionResult<{ ref: string; waLink: string | null }>> {
  try {
    const staff = await requirePermission("messages.send");
    const result = await sendMockupToCustomer(staff, input);
    if (result.ok) revalidatePath("/dashboard/desk");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Desk → «العميل وافق على الموكاب» / «العميل طلب تعديل». */
export async function mockupDecisionAction(
  input: MockupDecisionInput,
): Promise<ActionResult<{ ref: string; waLink: string | null }>> {
  try {
    const staff = await requirePermission("messages.send");
    const result = await recordMockupDecision(staff, input);
    if (result.ok) revalidatePath("/dashboard/desk");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}
