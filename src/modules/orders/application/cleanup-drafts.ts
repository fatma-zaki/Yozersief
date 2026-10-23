import "server-only";
import { logger } from "@/lib/logger";
import { deleteExpiredUploadDrafts } from "../infrastructure/submit-repository";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";

/**
 * Deletes expired anonymous upload drafts and best-effort removes their blobs.
 * Orphan risk if delete fails: blob may linger until Blob lifecycle rules; DB row is gone.
 */
export async function cleanupExpiredUploadDrafts(): Promise<{
  removed: number;
  blobsDeleted: number;
}> {
  const rows = await deleteExpiredUploadDrafts();
  const storage = createFileStorage();
  let blobsDeleted = 0;
  if (storage) {
    for (const row of rows) {
      try {
        await storage.delete(row.storageKey);
        blobsDeleted += 1;
      } catch (error) {
        logger.warn("upload draft blob delete failed", { id: row.id, error });
      }
    }
  }
  return { removed: rows.length, blobsDeleted };
}
