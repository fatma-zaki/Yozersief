import { cacheLife, cacheTag, updateTag } from "next/cache";
import { logActivity } from "@/modules/audit";
import {
  blobUploadMode,
  createFileStorage,
  type BlobUploadMode,
  type StoredBlobContent,
} from "@/modules/orders";
import { withTransaction, type Tx } from "@/db/tx";
import { isAppError, NotFoundError, ValidationError, type AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertCan, can, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import {
  applyGalleryChange,
  GALLERY_IMAGE_TYPES,
  GALLERY_MAX_BYTES,
  GALLERY_PATH_PREFIX,
  galleryState,
  galleryStats,
  NEW_ITEM_CATEGORY,
  type GalleryState,
} from "../domain/gallery";
import {
  deleteGalleryItem,
  findGalleryItemById,
  findGalleryItemByStorageKey,
  insertGalleryItem,
  listGalleryRows,
  listPublishedGalleryRows,
  lockGalleryItem,
  updateGalleryItem,
} from "../infrastructure/gallery-repository";
import {
  galleryDeleteSchema,
  galleryUpdateSchema,
  galleryUploadSchema,
  type GalleryDeleteInput,
  type GalleryUpdateInput,
  type GalleryUploadInput,
} from "../schemas";

/** One photo as the «أعمالنا» admin screen shows it (docs/design/Admin-Gallery.html). */
export type GalleryView = {
  id: string;
  img: string;
  cat: string;
  caption: string;
  consent: boolean;
  pub: boolean;
  isSample: boolean;
  state: GalleryState;
};

export type GalleryData = {
  items: GalleryView[];
  stats: ReturnType<typeof galleryStats>;
  /** How the browser uploads to Blob; null when uploads are not configured. */
  uploadMode: BlobUploadMode | null;
};

/** The design's sample photos, cycled by «أضف صورة تجريبية». */
const SAMPLE_IMAGES = [
  "/images/home/tshirt.jpg",
  "/images/home/shop-sign.jpg",
  "/images/home/mug-bottle.jpg",
];

async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await withTransaction(fn));
  } catch (error) {
    if (isAppError(error)) return err(error as AppError);
    throw error;
  }
}

/** Bundled samples load as static files; uploads go through our route (the store may be private). */
const imageSrc = (r: { id: string; imageUrl: string; storageKey: string | null }) =>
  r.storageKey ? `/api/gallery/image/${r.id}` : r.imageUrl;

export async function getGallery(actor: StaffContext): Promise<GalleryData> {
  assertCan(actor, "gallery.manage");
  const rows = await listGalleryRows();
  return {
    items: rows.map((r) => ({
      id: r.id,
      img: imageSrc(r),
      cat: r.category ?? NEW_ITEM_CATEGORY,
      caption: r.caption ?? "",
      consent: r.customerConsent,
      pub: r.isPublished,
      isSample: r.isSample,
      state: galleryState(r),
    })),
    stats: galleryStats(rows),
    uploadMode: blobUploadMode(),
  };
}

/**
 * Records a photo the browser uploaded to Blob. Size and type come from storage, never the
 * client; the same upload confirmed twice returns the same item. New photos start hidden and
 * without consent.
 */
export async function addUploadedPhoto(
  actor: StaffContext,
  raw: GalleryUploadInput,
): Promise<Result<{ id: string }>> {
  assertCan(actor, "gallery.manage");
  const input = galleryUploadSchema.parse(raw);
  if (!input.pathname.startsWith(GALLERY_PATH_PREFIX)) {
    return err(new ValidationError({}, "الصورة دي مش من رفع المعرض."));
  }
  const storage = createFileStorage();
  if (!storage) return err(new ValidationError({}, "رفع الملفات مش متاح دلوقتي."));
  const meta = await storage.head(input.url);
  if (meta.pathname !== input.pathname) {
    return err(new ValidationError({}, "الصورة دي مش من رفع المعرض."));
  }
  if (!(GALLERY_IMAGE_TYPES as readonly string[]).includes(meta.contentType)) {
    await storage.delete(meta.url).catch(() => undefined);
    return err(new ValidationError({}, "الصورة لازم تكون JPG أو PNG."));
  }
  if (meta.size > GALLERY_MAX_BYTES) {
    await storage.delete(meta.url).catch(() => undefined);
    return err(new ValidationError({}, "الصورة أكبر من 20 ميجا [الحد بانتظار التأكيد]."));
  }
  return inTransaction(async (tx) => {
    const existing = await findGalleryItemByStorageKey(meta.url, tx);
    if (existing) return existing;
    const row = await insertGalleryItem(
      {
        imageUrl: meta.url,
        storageKey: meta.url,
        category: NEW_ITEM_CATEGORY,
        isSample: false,
        createdBy: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "gallery.uploaded",
      entityType: "gallery_item",
      entityId: row.id,
      meta: { size: meta.size, contentType: meta.contentType },
    });
    return row;
  });
}

/** «أضف صورة تجريبية»: a sample photo from the design, hidden until consent. */
export async function addSamplePhoto(actor: StaffContext): Promise<Result<{ id: string }>> {
  assertCan(actor, "gallery.manage");
  const rows = await listGalleryRows();
  const imageUrl = SAMPLE_IMAGES[rows.length % SAMPLE_IMAGES.length]!;
  return inTransaction(async (tx) => {
    const row = await insertGalleryItem(
      {
        imageUrl,
        storageKey: null,
        category: NEW_ITEM_CATEGORY,
        isSample: true,
        createdBy: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "gallery.sample_added",
      entityType: "gallery_item",
      entityId: row.id,
    });
    return row;
  });
}

/** Caption, consent and publish changes, enforcing the consent rule (brief A6.8). */
export async function updateGalleryPhoto(
  actor: StaffContext,
  raw: GalleryUpdateInput,
): Promise<Result<{ state: GalleryState; unpublishedByConsent: boolean }>> {
  assertCan(actor, "gallery.manage");
  const input = galleryUpdateSchema.parse(raw);
  return inTransaction(async (tx) => {
    const item = await lockGalleryItem(input.id, tx);
    if (!item) throw new NotFoundError(`gallery item ${input.id}`);
    const change = applyGalleryChange(item, {
      ...(input.consent !== undefined ? { consent: input.consent } : {}),
      ...(input.published !== undefined ? { published: input.published } : {}),
    });
    if (!change.ok) throw new ValidationError({}, change.message);
    const { customerConsent, isPublished } = change.flags;
    await updateGalleryItem(
      item.id,
      {
        ...(input.caption !== undefined ? { caption: input.caption || null } : {}),
        customerConsent,
        isPublished,
        ...(customerConsent !== item.customerConsent
          ? { consentAt: customerConsent ? new Date() : null }
          : {}),
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "gallery.updated",
      entityType: "gallery_item",
      entityId: item.id,
      meta: {
        from: { consent: item.customerConsent, published: item.isPublished },
        to: { consent: customerConsent, published: isPublished },
        captionChanged: input.caption !== undefined && input.caption !== (item.caption ?? ""),
      },
    });
    return {
      state: galleryState(change.flags),
      unpublishedByConsent: item.isPublished && !isPublished && input.published === undefined,
    };
  });
}

/** Deletes a photo; an uploaded file is removed from Blob after the row is gone. */
export async function deleteGalleryPhoto(
  actor: StaffContext,
  raw: GalleryDeleteInput,
): Promise<Result<{ deleted: true }>> {
  assertCan(actor, "gallery.manage");
  const input = galleryDeleteSchema.parse(raw);
  const result = await inTransaction(async (tx) => {
    const item = await lockGalleryItem(input.id, tx);
    if (!item) throw new NotFoundError(`gallery item ${input.id}`);
    await deleteGalleryItem(item.id, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "gallery.deleted",
      entityType: "gallery_item",
      entityId: item.id,
      meta: { wasPublished: item.isPublished, isSample: item.isSample },
    });
    return item.storageKey;
  });
  if (!result.ok) return result;
  if (result.value) {
    await createFileStorage()
      ?.delete(result.value)
      .catch((error: unknown) => logger.warn("gallery blob delete failed", { error }));
  }
  return ok({ deleted: true });
}

/**
 * An uploaded gallery photo for `/api/gallery/image/[id]`. Published photos are public; others
 * only for staff who manage the gallery. Bundled samples are static files and never come here.
 */
export async function readGalleryImage(
  viewer: StaffContext | null,
  id: string,
): Promise<StoredBlobContent & { published: boolean }> {
  const item = await findGalleryItemById(id);
  if (!item?.storageKey) throw new NotFoundError(`gallery image ${id}`);
  if (!item.isPublished && !(viewer && can(viewer, "gallery.manage"))) {
    throw new NotFoundError(`gallery image ${id}`);
  }
  const content = await createFileStorage()?.read(item.storageKey);
  if (!content) throw new NotFoundError(`gallery blob ${id}`);
  return { ...content, published: item.isPublished };
}

export const PUBLIC_GALLERY_TAG = "gallery:public";

/** A published photo as the home «معرض الأعمال» shows it. */
export type PublicGalleryItem = {
  id: string;
  img: string;
  cat: string;
  caption: string;
  isSample: boolean;
};

/**
 * Published photos only (consent is required to publish, brief A6.8), newest first. Public
 * data; cached and invalidated by the dashboard's gallery actions.
 */
export async function getPublishedGallery(): Promise<PublicGalleryItem[]> {
  "use cache";
  cacheTag(PUBLIC_GALLERY_TAG);
  cacheLife("minutes");
  const rows = await listPublishedGalleryRows();
  return rows.map((r) => ({
    id: r.id,
    img: imageSrc(r),
    cat: r.category ?? NEW_ITEM_CATEGORY,
    caption: r.caption ?? "",
    isSample: r.isSample,
  }));
}

/** Call from the server actions that change gallery photos. */
export function invalidatePublishedGallery(): void {
  updateTag(PUBLIC_GALLERY_TAG);
}
