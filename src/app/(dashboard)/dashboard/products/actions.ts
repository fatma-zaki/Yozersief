"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  createService,
  invalidatePublicCatalog,
  saveProduct,
  setProductVisibility,
} from "@/modules/catalog";
import type {
  CreateServiceInput,
  ProductVisibilityInput,
  SaveProductInput,
} from "@/modules/catalog/schemas";

/** Products → «إضافة المنتج» / «حفظ التعديلات» (brief B4). */
export async function saveProductAction(
  input: SaveProductInput,
): Promise<ActionResult<{ id: number; name: string; created: boolean }>> {
  try {
    const staff = await requirePermission("catalog.manage");
    const result = await saveProduct(staff, input);
    if (result.ok) {
      revalidatePath("/dashboard/products");
      // The home page and the request builder show the catalog.
      invalidatePublicCatalog();
    }
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Products → «إضافة خدمة». */
export async function createServiceAction(
  input: CreateServiceInput,
): Promise<ActionResult<{ key: string; name: string }>> {
  try {
    const staff = await requirePermission("catalog.manage");
    const result = await createService(staff, input);
    if (result.ok) {
      revalidatePath("/dashboard/products");
      // The home page and the request builder show the catalog.
      invalidatePublicCatalog();
    }
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Products → «ظاهر في الموقع» switch. */
export async function setProductVisibilityAction(
  input: ProductVisibilityInput,
): Promise<ActionResult<{ name: string; visible: boolean }>> {
  try {
    const staff = await requirePermission("catalog.manage");
    const result = await setProductVisibility(staff, input);
    if (result.ok) {
      revalidatePath("/dashboard/products");
      // The home page and the request builder show the catalog.
      invalidatePublicCatalog();
    }
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}
