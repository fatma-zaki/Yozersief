import { lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { trackingLinks, verificationCodes } from "@/db/schema";

/** Hourly cron: OTP rows are useless a day after expiry (brief A6.9). */
export async function cleanupVerificationCodes(): Promise<number> {
  const removed = await db
    .delete(verificationCodes)
    .where(lt(verificationCodes.expiresAt, sql`now() - interval '1 day'`))
    .returning({ id: verificationCodes.id });
  return removed.length;
}

/** Daily cron: expired tracking links. Links without an expiry (pending, B13 #3) are kept. */
export async function cleanupTrackingLinks(): Promise<number> {
  const removed = await db
    .delete(trackingLinks)
    .where(lt(trackingLinks.expiresAt, sql`now()`))
    .returning({ id: trackingLinks.id });
  return removed.length;
}
