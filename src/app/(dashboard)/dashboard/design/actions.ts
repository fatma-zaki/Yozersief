"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import { flagCustomerFiles, submitMockup } from "@/modules/orders";
import type { FlagFileInput, MockupUploadInput } from "@/modules/orders/schemas";

/** Design → «ارفع نسخة موكاب جديدة» (after the browser uploaded the file to Blob). */
export async function submitMockupAction(
  input: MockupUploadInput,
): Promise<ActionResult<{ ref: string; version: number }>> {
  try {
    const staff = await requirePermission("mockups.manage");
    const result = await submitMockup(staff, input);
    if (result.ok) revalidatePath("/dashboard/design");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Design → «أبلغ الاستقبال بمشكلة في الملف». */
export async function flagFilesAction(
  input: FlagFileInput,
): Promise<ActionResult<{ ref: string }>> {
  try {
    const staff = await requirePermission("mockups.manage");
    return fromResult(await flagCustomerFiles(staff, input));
  } catch (error) {
    return actionError(error);
  }
}
