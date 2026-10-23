import type { DbOrTx } from "@/db/tx";
import { activityLogs } from "@/db/schema";

export type ActivityEntry = {
  /** Staff actor; null for system or customer actions. */
  userId: string | null;
  /** `module.verb`, e.g. `orders.approved`, `customers.phone_viewed`. */
  action: string;
  entityType: string;
  entityId: string;
  orderId?: string | null;
  /** Reads or reveals of personal/payment data (brief A6.3, A6.8). */
  isSensitive?: boolean;
  meta?: Record<string, unknown>;
};

/** Writes one audit row. Pass the use case's transaction so it commits with the change. */
export async function logActivity(dbOrTx: DbOrTx, entry: ActivityEntry): Promise<void> {
  await dbOrTx.insert(activityLogs).values({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    orderId: entry.orderId ?? null,
    isSensitive: entry.isSensitive ?? false,
    meta: entry.meta ?? null,
  });
}
