import { and, asc, desc, eq, gte, inArray, isNotNull, max, min, ne } from "drizzle-orm";
import { orderEvents, orders, quotes } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

/** Event types per order, oldest first (where each order stands for the desk). */
export async function listEventTypesFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({ orderId: orderEvents.orderId, type: orderEvents.type })
    .from(orderEvents)
    .where(inArray(orderEvents.orderId, orderIds))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
}

/** Quote drafts waiting for the admin, newest version first. */
export async function listPendingQuotesFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({
      orderId: quotes.orderId,
      unitPrice: quotes.unitPrice,
      total: quotes.total,
      leadTimeDays: quotes.leadTimeDays,
    })
    .from(quotes)
    .where(and(inArray(quotes.orderId, orderIds), eq(quotes.status, "pending_admin")))
    .orderBy(desc(quotes.version));
}

export async function hasPendingQuote(orderId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.orderId, orderId), eq(quotes.status, "pending_admin")))
    .limit(1);
  return Boolean(row);
}

export async function insertQuote(
  values: {
    orderId: string;
    unitPrice: string;
    total: string;
    leadTimeDays: number;
    preparedBy: string;
  },
  tx: DbOrTx,
) {
  const [last] = await tx
    .select({ v: max(quotes.version) })
    .from(quotes)
    .where(eq(quotes.orderId, values.orderId));
  const [row] = await tx
    .insert(quotes)
    .values({ ...values, version: (last?.v ?? 0) + 1, status: "pending_admin" })
    .returning({ id: quotes.id, version: quotes.version });
  return row!;
}

/** Closes the order's pending draft once the admin decides: sent with the quote, or declined. */
export async function settlePendingQuote(
  orderId: string,
  outcome: { status: "sent"; approvedBy: string } | { status: "declined" },
  tx: DbOrTx,
) {
  await tx
    .update(quotes)
    .set(
      outcome.status === "sent"
        ? { status: "sent", approvedBy: outcome.approvedBy, sentAt: new Date() }
        : { status: "declined" },
    )
    .where(and(eq(quotes.orderId, orderId), eq(quotes.status, "pending_admin")));
}

/** Orders submitted since `since` and the time of their first staff event («متوسط أول رد»). */
export async function listFirstResponses(since: Date, tx: DbOrTx = db) {
  const rows = await tx
    .select({ submittedAt: orders.createdAt, firstActionAt: min(orderEvents.createdAt) })
    .from(orders)
    .innerJoin(orderEvents, eq(orderEvents.orderId, orders.id))
    .where(
      and(
        gte(orders.createdAt, since),
        isNotNull(orderEvents.actorId),
        ne(orderEvents.type, "submitted"),
      ),
    )
    .groupBy(orders.id, orders.createdAt);
  return rows.flatMap((r) =>
    r.firstActionAt ? [{ submittedAt: r.submittedAt, firstActionAt: r.firstActionAt }] : [],
  );
}
