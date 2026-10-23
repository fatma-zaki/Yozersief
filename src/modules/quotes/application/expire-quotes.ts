import { and, eq, lt, sql } from "drizzle-orm";
import { logActivity } from "@/modules/audit";
import { quotes } from "@/db/schema";
import { withTransaction } from "@/db/tx";
import { cairoDateString } from "@/lib/format";

/**
 * Daily cron (brief A6.9, B3): sent quotes past `valid_until` become `expired`; a new version is
 * needed. Validity itself is pending (B13 #3), so quotes without a date never expire.
 */
export async function expireQuotes(now = new Date()): Promise<number> {
  const today = cairoDateString(now);
  return withTransaction(async (tx) => {
    const expired = await tx
      .update(quotes)
      .set({ status: "expired" })
      .where(and(eq(quotes.status, "sent"), lt(quotes.validUntil, sql`${today}::date`)))
      .returning({ id: quotes.id, orderId: quotes.orderId });
    for (const q of expired) {
      await logActivity(tx, {
        userId: null,
        action: "quotes.expired",
        entityType: "quote",
        entityId: q.id,
        orderId: q.orderId,
      });
    }
    return expired.length;
  });
}
