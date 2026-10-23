import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { isAppError, toAppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import { completeUploadedFile, uploadPayloadSchema } from "@/modules/orders";

/**
 * Client-side completion for anonymous draft uploads when Blob's server callback
 * does not run (localhost) or as an idempotent retry after `upload()`.
 * Always re-validates via storage `head()` — never trusts client size/type.
 */
const bodySchema = z.object({
  url: z.url(),
  pathname: z.string().min(1),
  contentType: z.string().min(1),
  /** Original client pathname before Blob's random suffix (same as token request). */
  requestedPathname: z.string().min(1),
  clientPayload: z.string().min(2),
});

export async function POST(request: Request) {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "رفع الملفات مش متاح دلوقتي." }, { status: 503 });
  }

  try {
    await enforceRateLimit("upload.token", clientIp(request.headers));
    const body = bodySchema.parse(await request.json());
    const payload = uploadPayloadSchema.parse(JSON.parse(body.clientPayload));

    if (!payload.submissionKey) {
      throw new ValidationError({}, "تأكيد الرفع ده لملفات الطلب من صفحة الطلب بس.");
    }

    await completeUploadedFile(
      {
        url: body.url,
        pathname: body.pathname,
        contentType: body.contentType,
      },
      {
        kind: payload.kind,
        submissionKey: payload.submissionKey,
        staffId: null,
        requestedPathname: body.requestedPathname,
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("upload confirm failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
