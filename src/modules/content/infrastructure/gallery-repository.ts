import { and, desc, eq } from "drizzle-orm";
import { galleryItems } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

export async function listGalleryRows(tx: DbOrTx = db) {
  return tx
    .select({
      id: galleryItems.id,
      imageUrl: galleryItems.imageUrl,
      storageKey: galleryItems.storageKey,
      category: galleryItems.category,
      caption: galleryItems.caption,
      isSample: galleryItems.isSample,
      customerConsent: galleryItems.customerConsent,
      isPublished: galleryItems.isPublished,
      createdAt: galleryItems.createdAt,
    })
    .from(galleryItems)
    .orderBy(desc(galleryItems.createdAt), desc(galleryItems.id));
}

/** Published photos with consent (both are required to show a photo publicly). */
export async function listPublishedGalleryRows(tx: DbOrTx = db) {
  return tx
    .select({
      id: galleryItems.id,
      imageUrl: galleryItems.imageUrl,
      storageKey: galleryItems.storageKey,
      category: galleryItems.category,
      caption: galleryItems.caption,
      isSample: galleryItems.isSample,
    })
    .from(galleryItems)
    .where(and(eq(galleryItems.isPublished, true), eq(galleryItems.customerConsent, true)))
    .orderBy(desc(galleryItems.createdAt), desc(galleryItems.id));
}

export type GalleryRow = Awaited<ReturnType<typeof listGalleryRows>>[number];

/** Locks the row so concurrent consent / publish changes serialise. */
export async function lockGalleryItem(id: string, tx: DbOrTx) {
  const [row] = await tx.select().from(galleryItems).where(eq(galleryItems.id, id)).for("update");
  return row ?? null;
}

export async function findGalleryItemById(id: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select({
      id: galleryItems.id,
      storageKey: galleryItems.storageKey,
      isPublished: galleryItems.isPublished,
    })
    .from(galleryItems)
    .where(eq(galleryItems.id, id));
  return row ?? null;
}

export async function findGalleryItemByStorageKey(storageKey: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ id: galleryItems.id })
    .from(galleryItems)
    .where(eq(galleryItems.storageKey, storageKey));
  return row ?? null;
}

export async function insertGalleryItem(
  values: {
    imageUrl: string;
    storageKey: string | null;
    category: string;
    isSample: boolean;
    createdBy: string;
  },
  tx: DbOrTx,
) {
  const [row] = await tx.insert(galleryItems).values(values).returning({ id: galleryItems.id });
  return row!;
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<{
    caption: string | null;
    customerConsent: boolean;
    consentAt: Date | null;
    isPublished: boolean;
  }>,
  tx: DbOrTx,
) {
  await tx.update(galleryItems).set(patch).where(eq(galleryItems.id, id));
}

export async function deleteGalleryItem(id: string, tx: DbOrTx) {
  await tx.delete(galleryItems).where(eq(galleryItems.id, id));
}
