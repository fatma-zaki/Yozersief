"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  addSamplePhoto,
  addUploadedPhoto,
  deleteGalleryPhoto,
  invalidatePublishedGallery,
  updateGalleryPhoto,
  type GalleryState,
} from "@/modules/content";
import type {
  GalleryDeleteInput,
  GalleryUpdateInput,
  GalleryUploadInput,
} from "@/modules/content/schemas";

const done = <T>(result: ActionResult<T>) => {
  if (result.ok) {
    revalidatePath("/dashboard/gallery");
    // The home «معرض الأعمال» shows published photos.
    invalidatePublishedGallery();
  }
  return result;
};

/** «ارفع صور جديدة»: records a photo the browser uploaded to Blob. */
export async function addGalleryUploadAction(
  input: GalleryUploadInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const staff = await requirePermission("gallery.manage");
    return done(fromResult(await addUploadedPhoto(staff, input)));
  } catch (error) {
    return actionError(error);
  }
}

/** «أضف صورة تجريبية». */
export async function addGallerySampleAction(): Promise<ActionResult<{ id: string }>> {
  try {
    const staff = await requirePermission("gallery.manage");
    return done(fromResult(await addSamplePhoto(staff)));
  } catch (error) {
    return actionError(error);
  }
}

/** Caption, «معايا موافقة العميل» and «منشورة في الموقع». */
export async function updateGalleryAction(
  input: GalleryUpdateInput,
): Promise<ActionResult<{ state: GalleryState; unpublishedByConsent: boolean }>> {
  try {
    const staff = await requirePermission("gallery.manage");
    return done(fromResult(await updateGalleryPhoto(staff, input)));
  } catch (error) {
    return actionError(error);
  }
}

/** «امسح». */
export async function deleteGalleryAction(
  input: GalleryDeleteInput,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const staff = await requirePermission("gallery.manage");
    return done(fromResult(await deleteGalleryPhoto(staff, input)));
  } catch (error) {
    return actionError(error);
  }
}
