import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getStaffContext } from "@/lib/auth/session";
import { isAppError, toAppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import { assertCan } from "@/lib/rbac";
import { GALLERY_IMAGE_TYPES, GALLERY_MAX_BYTES, GALLERY_PATH_PREFIX } from "@/modules/content";
import { blobUploadMode } from "@/modules/orders";

/**
 * Upload tokens for «أعمالنا» photos (brief A6.5): staff with gallery.manage upload straight to
 * Blob under `gallery/`. The photo is recorded by `addGalleryUploadAction`, which re-checks the
 * file with head(); Blob's completion callback is not needed (and never runs on localhost).
 */
export async function POST(request: Request) {
  const mode = blobUploadMode();
  if (!mode) {
    return NextResponse.json({ error: "رفع الملفات مش متاح دلوقتي." }, { status: 503 });
  }

  const authorize = async (pathname: string) => {
    await enforceRateLimit("upload.token", clientIp(request.headers));
    const staff = await getStaffContext();
    if (!staff) throw new UnauthorizedError();
    assertCan(staff, "gallery.manage");
    if (!pathname.startsWith(GALLERY_PATH_PREFIX) || pathname.includes("..")) {
      throw new ValidationError({}, "مسار الصورة مش صحيح.");
    }
    return {
      allowedContentTypes: [...GALLERY_IMAGE_TYPES],
      maximumSizeInBytes: GALLERY_MAX_BYTES,
      addRandomSuffix: true,
    };
  };

  try {
    if (mode === "token") {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        token: env.BLOB_READ_WRITE_TOKEN,
        onBeforeGenerateToken: authorize,
        onUploadCompleted: async () => undefined,
      });
      return NextResponse.json(result);
    }

    const body = (await request.json()) as HandleUploadPresignedBody;
    const result = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname) => {
        const urlOptions = await authorize(pathname);
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: urlOptions.allowedContentTypes,
          maximumSizeInBytes: urlOptions.maximumSizeInBytes,
          validUntil: Date.now() + 10 * 60 * 1000,
        });
        return { token, urlOptions };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("gallery upload token failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
