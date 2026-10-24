import { z } from "zod";
import { logActivity } from "@/modules/audit";
import { orderFiles } from "@/db/schema";
import { withTransaction } from "@/db/tx";
import { env } from "@/env";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { can, type StaffContext } from "@/lib/rbac";
import { hashToken } from "@/lib/tokens";
import {
  allowedContentTypes,
  checkUpload,
  draftPathPrefix,
  FILE_KINDS,
  isAllowedContentType,
  MAX_FILE_BYTES,
  type FileKind,
} from "../domain/files";
import { orderExists } from "../infrastructure/order-repository";
import { countDraftsForSubmission, insertUploadDraft } from "../infrastructure/submit-repository";
import type { FileStorage } from "./file-storage";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";

/** Max anonymous draft files per submission key (abuse ceiling). */
export const MAX_DRAFTS_PER_SUBMISSION = 20;

/** Drafts expire after 24h if never claimed into an order. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export const uploadPayloadSchema = z
  .object({
    kind: z.enum(FILE_KINDS),
    /** Present when attaching to an existing order (staff). */
    orderId: z.uuid().optional(),
    /**
     * Anonymous Request Builder uploads before the order exists. Must match the
     * pathname prefix `drafts/{draftPathId}/` (SHA-256 of the key, not the raw UUID)
     * and the later submit `submissionKey`.
     */
    submissionKey: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    const hasOrder = Boolean(value.orderId);
    const hasDraft = Boolean(value.submissionKey);
    if (hasOrder === hasDraft) {
      ctx.addIssue({
        code: "custom",
        message: "يجب تحديد طلب موجود أو مفتاح رفع مؤقت، وليس الاثنين معًا.",
        path: hasOrder ? ["submissionKey"] : ["orderId"],
      });
    }
    if (hasDraft && value.kind === "mockup") {
      ctx.addIssue({
        code: "custom",
        message: "رفع الموكاب متاح للفريق فقط.",
        path: ["kind"],
      });
    }
  });

export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

export type AuthorizeUploadDeps = {
  orderExists?: (orderId: string) => Promise<boolean>;
  countDrafts?: (submissionKeyHash: string) => Promise<number>;
  hashSecret?: string;
};

/**
 * Decides whether a client may upload `pathname` (brief A6.5). Returns the Blob token options.
 *
 * Paths:
 * - Staff + `orderId`: order must exist; `orders.view` (and `mockups.manage` for mockups).
 * - Anonymous + `submissionKey`: draft registry; mockups forbidden; pathname prefix enforced.
 */
export async function authorizeUpload(
  staff: StaffContext | null,
  pathname: string,
  payload: UploadPayload,
  deps: AuthorizeUploadDeps = {},
) {
  const check = checkUpload({ kind: payload.kind, fileName: pathname });
  if (!check.ok) throw new ValidationError({ file: [check.message] }, check.message);

  if (payload.submissionKey && payload.orderId) {
    throw new ValidationError(
      { orderId: ["متعارض"] },
      "يجب تحديد طلب موجود أو مفتاح رفع مؤقت، وليس الاثنين معًا.",
    );
  }

  if (payload.submissionKey) {
    const prefix = await draftPathPrefix(payload.submissionKey);
    if (!pathname.startsWith(prefix)) {
      throw new ValidationError(
        { file: ["مسار غير مسموح"] },
        "مسار الملف لا يطابق مفتاح الرفع. ارفعه مرة أخرى من صفحة الطلب.",
      );
    }
    if (payload.kind === "mockup") {
      throw new ForbiddenError(undefined, "رفع الموكاب متاح للفريق فقط.");
    }

    const secret = deps.hashSecret ?? env.TOKEN_HASH_SECRET;
    const submissionKeyHash = await hashToken(payload.submissionKey, secret);
    const count = await (deps.countDrafts ?? countDraftsForSubmission)(submissionKeyHash);
    if (count >= MAX_DRAFTS_PER_SUBMISSION) {
      throw new ValidationError(
        { file: ["بلغنا الحد الأقصى"] },
        "بلغت الحد الأقصى لعدد الملفات في هذا الطلب.",
      );
    }

    return {
      allowedContentTypes: allowedContentTypes(payload.kind),
      maximumSizeInBytes: MAX_FILE_BYTES,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({
        kind: payload.kind,
        submissionKey: payload.submissionKey,
        staffId: null,
        requestedPathname: pathname,
      }),
    };
  }

  if (!payload.orderId) {
    throw new ValidationError(
      { orderId: ["مطلوب"] },
      "رفع الملفات دون طلب غير متاح حاليًا. اربط الملف بطلب موجود.",
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
  submissionKey?: string;
  kind: FileKind;
  staffId: string | null;
  requestedPathname?: string;
};

/**
 * Validates Blob metadata via `head()` then inserts `order_files` or `upload_drafts`.
 * Does not trust client-reported size or content type.
 */
export async function completeUploadedFile(
  blob: UploadCompletionBlob,
  tokenPayload: UploadCompletionPayload,
  deps: {
    storage?: FileStorage | null;
    record?: typeof recordUploadedFile;
    recordDraft?: typeof recordUploadDraft;
  } = {},
) {
  if (!tokenPayload.orderId && !tokenPayload.submissionKey) return;

  const storage = deps.storage === undefined ? createFileStorage() : deps.storage;
  if (!storage) {
    throw new ValidationError({}, "رفع الملفات غير متاح حاليًا.");
  }

  let meta;
  try {
    meta = await storage.head(blob.url);
  } catch {
    throw new ValidationError(
      { file: ["لم نعثر على الملف"] },
      "الملف غير موجود في التخزين. ارفعه مرة أخرى.",
    );
  }

  // head(blob.url) is authoritative; reject if the callback pathname does not match that blob.
  if (meta.pathname !== blob.pathname) {
    throw new ValidationError(
      { file: ["مسار غير متطابق"] },
      "مسار الملف لا يتطابق مع ما رُفع. ارفعه مرة أخرى.",
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
      { file: ["نوع المحتوى غير مدعوم"] },
      "نوع الملف المرفوع ليس ضمن الأنواع المسموح بها.",
    );
  }

  if (tokenPayload.submissionKey) {
    const prefix = await draftPathPrefix(tokenPayload.submissionKey);
    if (!meta.pathname.startsWith(prefix)) {
      try {
        await storage.delete(meta.url);
      } catch {
        // best-effort
      }
      throw new ValidationError({ file: ["مسار غير مسموح"] }, "مسار الملف لا يطابق مفتاح الرفع.");
    }
    if (tokenPayload.kind === "mockup") {
      throw new ForbiddenError(undefined, "رفع الموكاب متاح للفريق فقط.");
    }
    const recordDraft = deps.recordDraft ?? recordUploadDraft;
    await recordDraft({
      submissionKey: tokenPayload.submissionKey,
      kind: tokenPayload.kind,
      url: meta.url,
      pathname: meta.pathname,
      contentType: meta.contentType,
      sizeBytes: meta.size,
    });
    return;
  }

  if (!tokenPayload.orderId) return;

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

export async function recordUploadDraft(input: {
  submissionKey: string;
  kind: FileKind;
  url: string;
  pathname: string;
  contentType: string;
  sizeBytes: number;
}) {
  if (input.kind === "mockup") {
    throw new ForbiddenError(undefined, "رفع الموكاب متاح للفريق فقط.");
  }
  const submissionKeyHash = await hashToken(input.submissionKey, env.TOKEN_HASH_SECRET);
  const count = await countDraftsForSubmission(submissionKeyHash);
  if (count >= MAX_DRAFTS_PER_SUBMISSION) {
    throw new ValidationError(
      { file: ["بلغنا الحد الأقصى"] },
      "بلغت الحد الأقصى لعدد الملفات في هذا الطلب.",
    );
  }
  await insertUploadDraft({
    submissionKeyHash,
    kind: input.kind,
    fileName: input.pathname.split("/").pop() ?? input.pathname,
    mimeType: input.contentType,
    sizeBytes: input.sizeBytes,
    storageKey: input.url,
    expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
  });
}
