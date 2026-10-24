import { and, count, countDistinct, desc, eq, gte, lt, min, sql } from "drizzle-orm";
import { pageViews } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

type NewPageView = typeof pageViews.$inferInsert;

export async function hasViewSince(visitorHash: string, since: Date, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ id: pageViews.id })
    .from(pageViews)
    .where(and(eq(pageViews.visitorHash, visitorHash), gte(pageViews.createdAt, since)))
    .limit(1);
  return Boolean(row);
}

export async function insertPageView(row: NewPageView, tx: DbOrTx = db) {
  await tx.insert(pageViews).values(row);
}

const inWindow = (from: Date, to: Date) =>
  and(gte(pageViews.createdAt, from), lt(pageViews.createdAt, to));

/** Visits (entry views) per bucket since `from`; empty buckets are absent. */
export async function visitsPerBucket(from: Date, to: Date, bucketMs: number, tx: DbOrTx = db) {
  const bucket = sql<number>`floor(extract(epoch from (${pageViews.createdAt} - ${from.toISOString()}::timestamptz)) * 1000 / ${bucketMs})::int`;
  return (
    tx
      .select({ bucket, visits: count() })
      .from(pageViews)
      .where(and(inWindow(from, to), eq(pageViews.isEntry, true)))
      // By position: repeating the expression would bind its parameters twice, and Postgres
      // would no longer see the GROUP BY as the selected column.
      .groupBy(sql`1`)
  );
}

/** Visits, distinct visitors, and distinct visitors who opened the request builder. */
export async function windowTotals(from: Date, to: Date, tx: DbOrTx = db) {
  const [row] = await tx
    .select({
      visits: sql<number>`count(*) filter (where ${pageViews.isEntry})::int`,
      visitors: countDistinct(pageViews.visitorHash),
      builderVisitors: sql<number>`count(distinct ${pageViews.visitorHash}) filter (where ${pageViews.path} = '/order')::int`,
    })
    .from(pageViews)
    .where(inWindow(from, to));
  return row ?? { visits: 0, visitors: 0, builderVisitors: 0 };
}

/** Visits per source or device, most first. */
export async function visitsBy(column: "source" | "device", from: Date, to: Date, tx: DbOrTx = db) {
  const key = pageViews[column];
  return tx
    .select({ key, visits: count() })
    .from(pageViews)
    .where(and(inWindow(from, to), eq(pageViews.isEntry, true)))
    .groupBy(key)
    .orderBy(desc(count()));
}

export async function topPages(from: Date, to: Date, limit: number, tx: DbOrTx = db) {
  return tx
    .select({ path: pageViews.path, views: count() })
    .from(pageViews)
    .where(inWindow(from, to))
    .groupBy(pageViews.path)
    .orderBy(desc(count()), pageViews.path)
    .limit(limit);
}

export async function countVisitorsSince(since: Date, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ n: countDistinct(pageViews.visitorHash) })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since));
  return row?.n ?? 0;
}

/** When recording started, for the notice on the dashboard. */
export async function firstViewAt(tx: DbOrTx = db) {
  const [row] = await tx.select({ at: min(pageViews.createdAt) }).from(pageViews);
  return row?.at ?? null;
}
