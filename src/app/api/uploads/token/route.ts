import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { assertTwoFactorEnrollment, getStaffContext } from "@/lib/auth/session";
import { isAppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import {
  authorizeUpload,
  completeUploadedFile,
  uploadPayloadSchema,
  type UploadCompletionPayload,
} from "@/modules/orders";

/**
 * Client uploads to Vercel Blob (brief A6.5): the browser asks here for a token, uploads
 * directly to Blob, and Blob calls back here when done (not on localhost).
 *
 * Anonymous draft tokens stay disabled until a draft registry + cleanup exist.
 * Staff attaching to an order must satisfy global 2FA when enforced; completion uses head().
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
        if (payload.orderId && staff) await assertTwoFactorEnrollment(staff);
        return authorizeUpload(staff, pathname, payload);
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as UploadCompletionPayload;
        await completeUploadedFile(
          {
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType,
          },
          payload,
        );
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("upload token failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
