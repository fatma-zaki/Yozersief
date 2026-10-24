import { and, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { activityLogs, orders, staffUsers } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

export type ActivityEntry = {
  /** Staff actor; null for system or customer actions. */
  userId: string | null;
  /** `module.verb`, e.g. `orders.approve`, `customers.phone_revealed`. */
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

export type ListActivityLogsQuery = {
  from: Date;
  to: Date;
  /** When set, only rows for this staff actor. */
  actorId?: string;
  /** When set, only these action strings (category mapping). Empty = no rows. */
  actions?: readonly string[];
  /** When false, rows with `is_sensitive = true` are excluded. */
  includeSensitive: boolean;
  limit: number;
};

export type ActivityLogRow = {
  id: number;
  createdAt: Date;
  action: string;
  actorId: string | null;
  actorName: string | null;
  orderRef: string | null;
  isSensitive: boolean;
};

/**
 * Newest-first activity for the team feed. Left-joins staff and orders so null `user_id` /
 * `order_id` rows stay visible. Does not select `meta`.
 */
export async function listActivityLogs(
  query: ListActivityLogsQuery,
  tx: DbOrTx = db,
): Promise<ActivityLogRow[]> {
  const conditions: SQL[] = [
    gte(activityLogs.createdAt, query.from),
    lte(activityLogs.createdAt, query.to),
  ];
  if (query.actorId) conditions.push(eq(activityLogs.userId, query.actorId));
  if (query.actions !== undefined) {
    if (query.actions.length === 0) return [];
    conditions.push(inArray(activityLogs.action, [...query.actions]));
  }
  if (!query.includeSensitive) conditions.push(eq(activityLogs.isSensitive, false));

  return tx
    .select({
      id: activityLogs.id,
      createdAt: activityLogs.createdAt,
      action: activityLogs.action,
      actorId: activityLogs.userId,
      actorName: staffUsers.name,
      orderRef: orders.ref,
      isSensitive: activityLogs.isSensitive,
    })
    .from(activityLogs)
    .leftJoin(staffUsers, eq(activityLogs.userId, staffUsers.id))
    .leftJoin(orders, eq(activityLogs.orderId, orders.id))
    .where(and(...conditions))
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(query.limit);
}
