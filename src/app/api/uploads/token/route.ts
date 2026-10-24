import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadOptions,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { assertTwoFactorEnrollment, getStaffContext } from "@/lib/auth/session";
import { isAppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import {
  authorizeUpload,
  blobUploadMode,
  completeUploadedFile,
  uploadPayloadSchema,
  type UploadCompletionPayload,
} from "@/modules/orders";

/**
 * Client uploads to Vercel Blob (brief A6.5): the browser asks here for a token, uploads
 * directly to Blob, and Blob calls back here when done (not on localhost — use /api/uploads/confirm).
 * Stores with a read-write token use `handleUpload` (client: `upload`). Newer stores set
 * BLOB_STORE_ID and authenticate with Vercel OIDC: `handleUploadPresigned`
 * (client: `uploadPresigned`). See `blobUploadMode`.
 *
 * Anonymous draft tokens use `submissionKey` (upload_drafts). Staff order attachments use `orderId`.
 * Staff attaching to an order must satisfy global 2FA when enforced; completion uses head().
 */
export async function POST(request: Request) {
  const mode = blobUploadMode();
  if (!mode) {
    return NextResponse.json({ error: "رفع الملفات غير متاح حاليًا." }, { status: 503 });
  }

  const authorize = async (pathname: string, clientPayload: string | null) => {
    await enforceRateLimit("upload.token", clientIp(request.headers));
    const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
    const staff = await getStaffContext();
    if (payload.orderId && staff) await assertTwoFactorEnrollment(staff);
    return authorizeUpload(staff, pathname, payload);
  };

  try {
    if (mode === "token") {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        token: env.BLOB_READ_WRITE_TOKEN,
        onBeforeGenerateToken: authorize,
        onUploadCompleted,
      });
      return NextResponse.json(result);
    }

    const body = (await request.json()) as HandleUploadPresignedBody;
    const result = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        const { allowedContentTypes, maximumSizeInBytes, addRandomSuffix, tokenPayload } =
          await authorize(pathname, clientPayload);
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes,
          maximumSizeInBytes,
          validUntil: Date.now() + 10 * 60 * 1000,
        });
        return {
          token,
          urlOptions: { allowedContentTypes, maximumSizeInBytes, addRandomSuffix, tokenPayload },
        };
      },
      onUploadCompleted,
    });
    return NextResponse.json(result);
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("upload token failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}

const onUploadCompleted: NonNullable<HandleUploadOptions["onUploadCompleted"]> = async ({
  blob,
  tokenPayload,
}) => {
  const payload = JSON.parse(tokenPayload ?? "{}") as UploadCompletionPayload;
  await completeUploadedFile(
    {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    },
    payload,
  );
};
