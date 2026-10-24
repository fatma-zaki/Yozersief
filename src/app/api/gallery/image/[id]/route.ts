import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffContext } from "@/lib/auth/session";
import { isAppError, NotFoundError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { readGalleryImage } from "@/modules/content";

/**
 * Serves an uploaded «أعمالنا» photo (brief B11). Published photos are public and cacheable;
 * unpublished ones only reach staff who manage the gallery (anyone else gets 404).
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/gallery/image/[id]">) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new NotFoundError("gallery image");
    const staff = await getStaffContext();
    const image = await readGalleryImage(staff, id);
    return new Response(image.stream, {
      headers: {
        "content-type": image.contentType,
        "content-length": String(image.size),
        "cache-control": image.published ? "public, max-age=300" : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("gallery image read failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
