import { and, asc, desc, eq, gte, inArray, max, sql } from "drizzle-orm";
import {
  deliveries,
  invoices,
  mockups,
  orderFiles,
  orderPieces,
  orders,
  payments,
  productionJobs,
  quotes,
} from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

/* ---------- Mockups ---------- */

/** Every mockup version of these orders, oldest first, with the file it points to. */
export async function listMockupsFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({
      id: mockups.id,
      orderId: mockups.orderId,
      version: mockups.version,
      status: mockups.status,
      customerFeedback: mockups.customerFeedback,
      sentAt: mockups.sentAt,
      decidedAt: mockups.decidedAt,
      uploadedAt: orderFiles.createdAt,
      fileName: orderFiles.fileName,
      storageKey: orderFiles.storageKey,
    })
    .from(mockups)
    .innerJoin(orderFiles, eq(orderFiles.id, mockups.fileId))
    .where(inArray(mockups.orderId, orderIds))
    .orderBy(asc(mockups.version));
}

export async function findLatestMockup(orderId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ id: mockups.id, version: mockups.version, status: mockups.status })
    .from(mockups)
    .where(eq(mockups.orderId, orderId))
    .orderBy(desc(mockups.version))
    .limit(1);
  return row ?? null;
}

export async function findLatestMockupFile(orderId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ id: mockups.id, storageKey: orderFiles.storageKey, status: mockups.status })
    .from(mockups)
    .innerJoin(orderFiles, eq(orderFiles.id, mockups.fileId))
    .where(eq(mockups.orderId, orderId))
    .orderBy(desc(mockups.version))
    .limit(1);
  return row ?? null;
}

/** The mockup's order_files row: reuses the one Blob's callback may already have written. */
export async function ensureMockupFile(
  values: {
    orderId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    uploadedBy: string;
  },
  tx: DbOrTx,
) {
  const [existing] = await tx
    .select({ id: orderFiles.id })
    .from(orderFiles)
    .where(
      and(eq(orderFiles.orderId, values.orderId), eq(orderFiles.storageKey, values.storageKey)),
    )
    .limit(1);
  if (existing) return existing;
  const [row] = await tx
    .insert(orderFiles)
    .values({ ...values, kind: "mockup" })
    .returning({ id: orderFiles.id });
  return row!;
}

export async function insertMockup(
  values: { orderId: string; fileId: string; designerId: string },
  tx: DbOrTx,
) {
  const [last] = await tx
    .select({ v: max(mockups.version) })
    .from(mockups)
    .where(eq(mockups.orderId, values.orderId));
  const [row] = await tx
    .insert(mockups)
    .values({ ...values, version: (last?.v ?? 0) + 1, status: "with_desk" })
    .returning({ id: mockups.id, version: mockups.version });
  return row!;
}

export async function markMockupSent(mockupId: string, tx: DbOrTx) {
  await tx
    .update(mockups)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(mockups.id, mockupId));
}

/** The customer's answer on the version they were sent. */
export async function decideSentMockup(
  orderId: string,
  outcome: { status: "approved" } | { status: "changes_requested"; feedback: string },
  tx: DbOrTx,
) {
  await tx
    .update(mockups)
    .set({
      status: outcome.status,
      decidedAt: new Date(),
      ...(outcome.status === "changes_requested" ? { customerFeedback: outcome.feedback } : {}),
    })
    .where(and(eq(mockups.orderId, orderId), eq(mockups.status, "sent")));
}

/* ---------- Production ---------- */

export async function listJobsFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx.select().from(productionJobs).where(inArray(productionJobs.orderId, orderIds));
}

export type JobPatch = Partial<{
  stage: "queue" | "printing" | "qc" | "ready";
  printedCount: number;
  qcSizesOk: boolean;
  qcNamesOk: boolean;
  qcPrintOk: boolean;
  qcCountOk: boolean;
  operatorId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}>;

/** One job per order (unique order_id): creates it on first touch. */
export async function upsertJob(orderId: string, patch: JobPatch, tx: DbOrTx) {
  const [row] = await tx
    .insert(productionJobs)
    .values({ orderId, stage: "printing", printedCount: 0, ...patch })
    .onConflictDoUpdate({ target: productionJobs.orderId, set: patch })
    .returning();
  return row!;
}

export async function findJob(orderId: string, tx: DbOrTx) {
  const [row] = await tx.select().from(productionJobs).where(eq(productionJobs.orderId, orderId));
  return row ?? null;
}

export async function listPiecesFor(orderId: string, tx: DbOrTx = db) {
  return tx
    .select()
    .from(orderPieces)
    .where(eq(orderPieces.orderId, orderId))
    .orderBy(asc(orderPieces.seq));
}

export async function setPiecePrinted(pieceId: number, printed: boolean, tx: DbOrTx) {
  const [row] = await tx
    .update(orderPieces)
    .set({ printedAt: printed ? new Date() : null })
    .where(eq(orderPieces.id, pieceId))
    .returning({ orderId: orderPieces.orderId });
  return row ?? null;
}

/* ---------- Delivery & payments ---------- */

export async function findOpenHandover(orderId: string, tx: DbOrTx) {
  const [row] = await tx
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.orderId, orderId), eq(deliveries.status, "ready")))
    .limit(1);
  return row ?? null;
}

export async function listOpenHandoversFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({ orderId: deliveries.orderId, failedCodeAttempts: deliveries.failedCodeAttempts })
    .from(deliveries)
    .where(and(inArray(deliveries.orderId, orderIds), eq(deliveries.status, "ready")));
}

/** Counts a wrong «آخر 3 أرقام» on the order's open handover; returns the new total. */
export async function addFailedCodeAttempt(orderId: string, quantity: number, tx: DbOrTx) {
  const open = await findOpenHandover(orderId, tx);
  if (open) {
    const [row] = await tx
      .update(deliveries)
      .set({ failedCodeAttempts: sql`${deliveries.failedCodeAttempts} + 1` })
      .where(eq(deliveries.id, open.id))
      .returning({ n: deliveries.failedCodeAttempts });
    return row!.n;
  }
  await tx.insert(deliveries).values({
    orderId,
    batchNo: await nextBatchNo(orderId, tx),
    quantity,
    status: "ready",
    failedCodeAttempts: 1,
  });
  return 1;
}

async function nextBatchNo(orderId: string, tx: DbOrTx) {
  const [last] = await tx
    .select({ n: max(deliveries.batchNo) })
    .from(deliveries)
    .where(eq(deliveries.orderId, orderId));
  return (last?.n ?? 0) + 1;
}

/** Closes the open handover (or writes one) as delivered. */
export async function recordDelivered(
  orderId: string,
  values: { quantity: number; deliveredBy: string | null },
  tx: DbOrTx,
) {
  const open = await findOpenHandover(orderId, tx);
  const done = { status: "delivered" as const, deliveredAt: new Date(), ...values };
  if (open) {
    await tx.update(deliveries).set(done).where(eq(deliveries.id, open.id));
    return;
  }
  await tx
    .insert(deliveries)
    .values({ orderId, batchNo: await nextBatchNo(orderId, tx), failedCodeAttempts: 0, ...done });
}

export async function listPaymentsFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({
      orderId: payments.orderId,
      kind: payments.kind,
      amount: payments.amount,
      status: payments.status,
    })
    .from(payments)
    .where(inArray(payments.orderId, orderIds));
}

export async function listRecentPayments(limit: number, tx: DbOrTx = db) {
  return tx
    .select({
      id: payments.id,
      ref: orders.ref,
      kind: payments.kind,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function insertPayment(
  values: {
    orderId: string;
    kind: "deposit" | "balance" | "full";
    amount: string;
    method: string;
    recordedBy: string;
  },
  tx: DbOrTx,
) {
  const [row] = await tx
    .insert(payments)
    .values({ ...values, status: "pending_admin" })
    .returning({ id: payments.id });
  return row!;
}

/** The admin confirms the deposits waiting on this order (brief B3 step 6). */
export async function confirmPendingDeposits(orderId: string, adminId: string, tx: DbOrTx) {
  return tx
    .update(payments)
    .set({ status: "confirmed", confirmedBy: adminId, confirmedAt: new Date() })
    .where(
      and(
        eq(payments.orderId, orderId),
        eq(payments.kind, "deposit"),
        eq(payments.status, "pending_admin"),
      ),
    )
    .returning({ id: payments.id });
}

export async function listOrdersWithPendingDeposit(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return new Set<string>();
  const rows = await tx
    .selectDistinct({ orderId: payments.orderId })
    .from(payments)
    .where(
      and(
        inArray(payments.orderId, orderIds),
        eq(payments.kind, "deposit"),
        eq(payments.status, "pending_admin"),
      ),
    );
  return new Set(rows.map((r) => r.orderId));
}

/** The total of the quote the admin sent (the price the customer accepted). */
export async function listSentQuoteTotals(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({ orderId: quotes.orderId, total: quotes.total, version: quotes.version })
    .from(quotes)
    .where(and(inArray(quotes.orderId, orderIds), inArray(quotes.status, ["sent", "accepted"])))
    .orderBy(desc(quotes.version));
}

export async function listInvoicedOrderIds(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return new Set<string>();
  const rows = await tx
    .selectDistinct({ orderId: invoices.orderId })
    .from(invoices)
    .where(inArray(invoices.orderId, orderIds));
  return new Set(rows.map((r) => r.orderId));
}

/* ---------- Sidebar badges ---------- */

export async function countWorkspaceOrders(tx: DbOrTx = db) {
  const [row] = await tx
    .select({
      design: sql<number>`count(*) filter (where ${orders.status} = 'approved' and ${orders.bizStage} = 'mockup')::int`,
      production: sql<number>`count(*) filter (where ${orders.status} = 'in_production' or (${orders.status} = 'approved' and (${orders.customerType} = 'person' or ${orders.bizStage} = 'production')))::int`,
      delivery: sql<number>`count(*) filter (where ${orders.status} = 'ready')::int`,
    })
    .from(orders);
  return row ?? { design: 0, production: 0, delivery: 0 };
}

/** Orders handed over since `since` («اتسلم» on today's list). */
export async function listDeliveredSince(since: Date, tx: DbOrTx = db) {
  const rows = await tx
    .selectDistinct({ orderId: deliveries.orderId })
    .from(deliveries)
    .where(and(eq(deliveries.status, "delivered"), gte(deliveries.deliveredAt, since)));
  return new Set(rows.map((r) => r.orderId));
}
