import { NotFoundError } from "@/lib/errors";
import { assertCan, type StaffContext } from "@/lib/rbac";
import { findOrderFileByStorageKey } from "../infrastructure/file-repository";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";
import type { StoredBlobContent } from "./file-storage";

export type OrderFileContent = StoredBlobContent & { fileName: string };

/**
 * A customer's order file for staff who can see orders (brief A6.5). Only keys recorded in
 * order_files are served, so the route can't be used to read arbitrary blobs.
 */
export async function readOrderFile(
  actor: StaffContext,
  storageKey: string,
): Promise<OrderFileContent> {
  assertCan(actor, "orders.view");
  const file = await findOrderFileByStorageKey(storageKey);
  if (!file) throw new NotFoundError("order file");
  const content = await createFileStorage()?.read(file.storageKey);
  if (!content) throw new NotFoundError("order file blob");
  return { ...content, contentType: file.mimeType || content.contentType, fileName: file.fileName };
}
