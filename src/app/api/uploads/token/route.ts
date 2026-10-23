import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getStaffContext } from "@/lib/auth/session";
import { isAppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import { authorizeUpload, recordUploadedFile, uploadPayloadSchema } from "@/modules/orders";

/**
 * Client uploads to Vercel Blob (brief A6.5): the browser asks here for a token, uploads
 * directly to Blob, and Blob calls back here when done (not on localhost).
 */
export async function POST(request: Request) {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "رفع الملفات مش متاح دلوقتي." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await enforceRateLimit("upload.token", clientIp(request.headers));
        const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        const staff = await getStaffContext();
        return authorizeUpload(staff, pathname, payload);
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          orderId?: string;
          kind: "design" | "reference" | "names_sheet" | "mockup";
          staffId: string | null;
        };
        if (!payload.orderId) return; // drafts are confirmed on order submission (Phase 1)
        await recordUploadedFile({
          orderId: payload.orderId,
          kind: payload.kind,
          staffId: payload.staffId,
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          // Blob's completion payload has no size; Phase 1 reads it with head().
          sizeBytes: 0,
        });
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("upload token failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
