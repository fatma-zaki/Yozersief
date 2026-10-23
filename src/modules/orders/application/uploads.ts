import { z } from "zod";
import { logActivity } from "@/modules/audit";
import { orderFiles } from "@/db/schema";
import { withTransaction } from "@/db/tx";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { can, type StaffContext } from "@/lib/rbac";
import {
  allowedContentTypes,
  checkUpload,
  FILE_KINDS,
  MAX_FILE_BYTES,
  type FileKind,
} from "../domain/files";

export const uploadPayloadSchema = z.object({
  kind: z.enum(FILE_KINDS),
  /** Present when attaching to an existing order (staff); absent for request-builder drafts. */
  orderId: z.uuid().optional(),
});
export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

/**
 * Decides whether a client may upload `pathname` (brief A6.5). Returns the Blob token options.
 * - Existing order: staff with orders.view; mockups need mockups.manage.
 * - Request-builder draft (no order yet): anyone, rate-limited by the route; confirmed on submit.
 *   Customer uploads to an existing order arrive with tracking in Phase 2.
 */
export function authorizeUpload(
  staff: StaffContext | null,
  pathname: string,
  payload: UploadPayload,
) {
  const check = checkUpload({ kind: payload.kind, fileName: pathname });
  if (!check.ok) throw new ValidationError({ file: [check.message] }, check.message);

  if (payload.orderId) {
    if (!staff || !can(staff, "orders.view")) throw new ForbiddenError("orders.view");
    if (payload.kind === "mockup" && !can(staff, "mockups.manage")) {
      throw new ForbiddenError("mockups.manage");
    }
  } else if (payload.kind === "mockup") {
    throw new ForbiddenError("mockups.manage");
  }

  return {
    allowedContentTypes: allowedContentTypes(payload.kind),
    maximumSizeInBytes: MAX_FILE_BYTES,
    addRandomSuffix: true,
    tokenPayload: JSON.stringify({ ...payload, staffId: staff?.id ?? null }),
  };
}

/** Called by Vercel Blob when an upload to an existing order finishes. */
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
