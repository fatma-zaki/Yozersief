import { z } from "zod";
import { logActivity } from "@/modules/audit";
import { orderFiles } from "@/db/schema";
import { withTransaction } from "@/db/tx";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { can, type StaffContext } from "@/lib/rbac";
import {
  allowedContentTypes,
  checkUpload,
  FILE_KINDS,
  isAllowedContentType,
  MAX_FILE_BYTES,
  type FileKind,
} from "../domain/files";
import { orderExists } from "../infrastructure/order-repository";
import type { FileStorage } from "./file-storage";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";

export const uploadPayloadSchema = z.object({
  kind: z.enum(FILE_KINDS),
  /** Present when attaching to an existing order (staff). Required until a draft registry exists. */
  orderId: z.uuid().optional(),
});
export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

export type AuthorizeUploadDeps = {
  orderExists?: (orderId: string) => Promise<boolean>;
};

/**
 * Decides whether a client may upload `pathname` (brief A6.5). Returns the Blob token options.
 *
 * Draft uploads (no orderId) stay rejected until an expiring draft registry + cleanup cron
 * exist (schema migration required — not in this task). Historical anonymous blobs cannot be
 * safely deleted without verifying they are absent from `order_files`; that cleanup is deferred.
 *
 * Order-attached uploads require:
 * - staff with `orders.view` (and `mockups.manage` for mockups)
 * - that the order row exists
 *
 * Per-order row-level ACL (e.g. assignee-only) is **not** defined in the codebase or brief yet;
 * until a business rule lands, existence + `orders.view` is the supported access check.
 */
export async function authorizeUpload(
  staff: StaffContext | null,
  pathname: string,
  payload: UploadPayload,
  deps: AuthorizeUploadDeps = {},
) {
  const check = checkUpload({ kind: payload.kind, fileName: pathname });
  if (!check.ok) throw new ValidationError({ file: [check.message] }, check.message);

  if (!payload.orderId) {
    throw new ValidationError(
      { orderId: ["مطلوب"] },
      "رفع الملفات من غير طلب مش متاح دلوقتي. اربط الملف بطلب موجود.",
    );
  }

  if (!staff || !can(staff, "orders.view")) throw new ForbiddenError("orders.view");
  if (payload.kind === "mockup" && !can(staff, "mockups.manage")) {
    throw new ForbiddenError("mockups.manage");
  }

  const exists = await (deps.orderExists ?? orderExists)(payload.orderId);
  if (!exists) throw new NotFoundError(`order ${payload.orderId} not found`);

  return {
    allowedContentTypes: allowedContentTypes(payload.kind),
    maximumSizeInBytes: MAX_FILE_BYTES,
    addRandomSuffix: true,
    tokenPayload: JSON.stringify({
      ...payload,
      staffId: staff.id,
      // Client-requested path before Blob's random suffix; completion binds to head() meta.
      requestedPathname: pathname,
    }),
  };
}

export type UploadCompletionBlob = {
  url: string;
  pathname: string;
  contentType: string;
};

export type UploadCompletionPayload = {
  orderId?: string;
  kind: FileKind;
  staffId: string | null;
  requestedPathname?: string;
};

/**
 * Validates Blob metadata via `head()` then inserts `order_files`.
 * Does not trust client-reported size or content type.
 */
export async function completeUploadedFile(
  blob: UploadCompletionBlob,
  tokenPayload: UploadCompletionPayload,
  deps: {
    storage?: FileStorage | null;
    record?: typeof recordUploadedFile;
  } = {},
) {
  if (!tokenPayload.orderId) return; // stale draft tokens: ignore

  const storage = deps.storage === undefined ? createFileStorage() : deps.storage;
  if (!storage) {
    throw new ValidationError({}, "رفع الملفات مش متاح دلوقتي.");
  }

  let meta;
  try {
    meta = await storage.head(blob.url);
  } catch {
    throw new ValidationError(
      { file: ["مش لاقيين الملف"] },
      "الملف مش موجود على التخزين. ارفع تاني.",
    );
  }

  // head(blob.url) is authoritative; reject if the callback pathname does not match that blob.
  if (meta.pathname !== blob.pathname) {
    throw new ValidationError(
      { file: ["مسار غير متطابق"] },
      "مسار الملف مش متطابق مع اللي اترفعت. ارفع تاني.",
    );
  }

  // Random suffix means final pathname ≠ requestedPathname; still require same extension/kind.
  if (tokenPayload.requestedPathname) {
    const requestedCheck = checkUpload({
      kind: tokenPayload.kind,
      fileName: tokenPayload.requestedPathname,
    });
    if (!requestedCheck.ok) {
      throw new ValidationError({ file: [requestedCheck.message] }, requestedCheck.message);
    }
  }

  const sizeCheck = checkUpload({
    kind: tokenPayload.kind,
    fileName: meta.pathname,
    sizeBytes: meta.size,
  });
  if (!sizeCheck.ok) {
    try {
      await storage.delete(meta.url);
    } catch {
      // Best-effort cleanup of an oversize/invalid blob; insert is skipped either way.
    }
    throw new ValidationError({ file: [sizeCheck.message] }, sizeCheck.message);
  }

  if (!isAllowedContentType(tokenPayload.kind, meta.pathname, meta.contentType)) {
    try {
      await storage.delete(meta.url);
    } catch {
      // best-effort
    }
    throw new ValidationError(
      { file: ["نوع المحتوى مش مدعوم"] },
      "نوع الملف اللي اترفعت مش ضمن الأنواع المسموحة.",
    );
  }

  const record = deps.record ?? recordUploadedFile;
  await record({
    orderId: tokenPayload.orderId,
    kind: tokenPayload.kind,
    staffId: tokenPayload.staffId,
    url: meta.url,
    pathname: meta.pathname,
    contentType: meta.contentType,
    sizeBytes: meta.size,
  });
}

/** Called after validation to persist the file row + activity log. */
export async function recordUploadedFile(input: {
  orderId: string;
  kind: FileKind;
  staffId: string | null;
  url: string;
  pathname: string;
  contentType: string;
  sizeBytes: number;
}) {
  await withTransaction(async (tx) => {
    const [file] = await tx
      .insert(orderFiles)
      .values({
        orderId: input.orderId,
        kind: input.kind,
        fileName: input.pathname.split("/").pop() ?? input.pathname,
        mimeType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey: input.url,
        uploadedBy: input.staffId,
      })
      .returning({ id: orderFiles.id });
    await logActivity(tx, {
      userId: input.staffId,
      action: "orders.file_uploaded",
      entityType: "order_file",
      entityId: file!.id,
      orderId: input.orderId,
      meta: { kind: input.kind },
    });
  });
}
