import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
  type HandleUploadOptions,
} from "@vercel/blob/client";
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
 * Stores with a read-write token use `handleUpload` (client: `upload`). Newer stores set
 * BLOB_STORE_ID and authenticate with Vercel OIDC: `handleUploadPresigned`
 * (client: `uploadPresigned`).
 */
export async function POST(request: Request) {
  if (!env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "رفع الملفات مش متاح دلوقتي." }, { status: 503 });
  }

  const authorize = async (pathname: string, clientPayload: string | null) => {
    await enforceRateLimit("upload.token", clientIp(request.headers));
    const payload = uploadPayloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
    const staff = await getStaffContext();
    return authorizeUpload(staff, pathname, payload);
  };

  try {
    if (env.BLOB_READ_WRITE_TOKEN) {
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
};
