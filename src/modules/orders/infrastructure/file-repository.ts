import { eq } from "drizzle-orm";
import { orderFiles } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

/** The order file stored under this key, if any (keys are blob URLs, unique per upload). */
export async function findOrderFileByStorageKey(storageKey: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select({
      id: orderFiles.id,
      orderId: orderFiles.orderId,
      fileName: orderFiles.fileName,
      mimeType: orderFiles.mimeType,
      storageKey: orderFiles.storageKey,
    })
    .from(orderFiles)
    .where(eq(orderFiles.storageKey, storageKey))
    .limit(1);
  return row ?? null;
}
