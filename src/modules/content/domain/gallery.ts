/**
 * «أعمالنا» gallery rules (brief A6.8, B11). Pure.
 * A photo of a customer's work is published only with that customer's consent; withdrawing
 * consent takes it off the site at once.
 */

export type GalleryState = "pub" | "hidden" | "pending";

export type GalleryFlags = { customerConsent: boolean; isPublished: boolean };

/** published · hidden (has consent, not shown) · pending (waiting for the customer's consent). */
export function galleryState(item: GalleryFlags): GalleryState {
  if (item.isPublished) return "pub";
  return item.customerConsent ? "hidden" : "pending";
}

export function galleryStats(items: readonly GalleryFlags[]) {
  const published = items.filter((i) => i.isPublished).length;
  const pending = items.filter((i) => !i.customerConsent).length;
  return { published, hidden: items.length - published - pending, pending };
}

export type GalleryChange = { consent?: boolean; published?: boolean };

/**
 * Applies a staff change to the flags. Returns the new flags, or an Arabic message when the
 * change breaks the consent rule (publishing without consent).
 */
export function applyGalleryChange(
  current: GalleryFlags,
  change: GalleryChange,
): { ok: true; flags: GalleryFlags } | { ok: false; message: string } {
  const customerConsent = change.consent ?? current.customerConsent;
  let isPublished = change.published ?? current.isPublished;
  if (change.published && !customerConsent) {
    return { ok: false, message: "لا يمكن نشر الصورة دون موافقة العميل." };
  }
  if (!customerConsent) isPublished = false;
  return { ok: true, flags: { customerConsent, isPublished } };
}

/** Photos staff may upload to the gallery. */
export const GALLERY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const GALLERY_MAX_BYTES = 20 * 1024 * 1024;
export const GALLERY_PATH_PREFIX = "gallery/";

/** The label new uploads get until staff rename them. */
export const NEW_ITEM_CATEGORY = "جديدة";
