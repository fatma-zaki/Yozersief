import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { recordPageView } from "@/modules/content";

const beaconSchema = z.object({
  path: z.string().max(2048),
  referrer: z.string().max(2048).nullable().default(null),
  utm: z.string().max(100).nullable().default(null),
});

/**
 * Page-view beacon from the public site (ADR-0008). Always answers 204, so a dropped or
 * malformed beacon never shows up as an error in the visitor's browser.
 */
export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  try {
    // Staff browsing the site while signed in are not visitors.
    if (request.cookies.getAll().some((c) => c.name.includes("yz.session_token"))) return done;
    // Read the (tiny) body first: the page may already be gone by the time Redis answers.
    const parsed = beaconSchema.safeParse(JSON.parse(await request.text()));
    if (!parsed.success) return done;
    const ip = clientIp(request.headers);
    if (!(await checkRateLimit("analytics.collect", ip))) return done;
    await recordPageView({
      path: parsed.data.path,
      referrer: parsed.data.referrer || null,
      utmSource: parsed.data.utm || null,
      userAgent: request.headers.get("user-agent") ?? "",
      ip,
      siteHost: request.nextUrl.hostname,
    });
  } catch (error) {
    logger.warn("page view not recorded", { error });
  }
  return done;
}
