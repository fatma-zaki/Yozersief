import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/session";
import { isAppError, toAppError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { readOrderFile } from "@/modules/orders";

/**
 * Streams a customer's order file to staff (brief A6.5): previews in the orders screen and
 * «تحميل» (`?download=1`). The Blob store may be private, so files are read server-side.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    const staff = await getStaffContext();
    if (!staff) throw new UnauthorizedError();
    const file = await readOrderFile(staff, key);
    const disposition = url.searchParams.get("download") ? "attachment" : "inline";
    return new Response(file.stream, {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.size),
        "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const appError = toAppError(error);
    if (!isAppError(error)) logger.error("order file read failed", { error });
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}
