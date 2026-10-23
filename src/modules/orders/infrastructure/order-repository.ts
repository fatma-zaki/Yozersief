import { and, desc, eq, sql } from "drizzle-orm";
import { activityLogs, mockups, orderEvents, orders, payments, productionJobs } from "@/db/schema";
import type { DbOrTx, Tx } from "@/db/tx";
import type { BizStage, OrderStatus } from "../domain/lifecycle";

/** Locks the order row for the rest of the transaction so concurrent transitions serialise. */
export async function lockOrder(orderId: string, tx: Tx) {
  const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  return rows[0] ?? null;
}

export async function updateOrderState(
  orderId: string,
  to: { status: OrderStatus; bizStage: BizStage | null },
  extra: { rejectionReason?: string | null },
  tx: DbOrTx,
) {
  await tx
    .update(orders)
    .set({
      status: to.status,
      bizStage: to.bizStage,
      updatedAt: new Date(),
      ...(extra.rejectionReason !== undefined ? { rejectionReason: extra.rejectionReason } : {}),
    })
    .where(eq(orders.id, orderId));
}

export async function insertOrderEvent(
  values: {
    orderId: string;
    type: string;
    titleAr: string;
    note: string | null;
    visibleToCustomer: boolean;
    actorId: string | null;
  },
  tx: DbOrTx,
) {
  const [row] = await tx.insert(orderEvents).values(values).returning({ id: orderEvents.id });
  return row!;
}

/** Facts the lifecycle guards need (brief B3). */
export async function loadGuardFacts(orderId: string, tx: DbOrTx) {
  const [mockup] = await tx
    .select({ id: mockups.id })
    .from(mockups)
    .where(and(eq(mockups.orderId, orderId), eq(mockups.status, "approved")))
    .limit(1);
  const [sentMockup] = await tx
    .select({ id: mockups.id })
    .from(mockups)
    .where(and(eq(mockups.orderId, orderId), eq(mockups.status, "sent")))
    .limit(1);
  const [deposit] = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.orderId, orderId),
        eq(payments.kind, "deposit"),
        eq(payments.status, "confirmed"),
      ),
    )
    .limit(1);
  const [job] = await tx.select().from(productionJobs).where(eq(productionJobs.orderId, orderId));

  return {
    mockupApproved: Boolean(mockup),
    mockupSent: Boolean(sentMockup),
    depositConfirmed: Boolean(deposit),
    qcPassed: Boolean(job?.qcSizesOk && job.qcNamesOk && job.qcPrintOk && job.qcCountOk),
  };
}

/** Status the order had when it was last paused for the customer (stored in the audit meta). */
export async function findPausedFrom(orderId: string, tx: DbOrTx): Promise<OrderStatus | null> {
  const [row] = await tx
    .select({ meta: activityLogs.meta })
    .from(activityLogs)
    .where(and(eq(activityLogs.orderId, orderId), eq(activityLogs.action, "orders.request_info")))
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(1);
  const from = (row?.meta as { fromStatus?: OrderStatus } | null)?.fromStatus;
  return from ?? null;
}

export async function countOrders(tx: DbOrTx) {
  const [row] = await tx.select({ n: sql<number>`count(*)::int` }).from(orders);
  return row?.n ?? 0;
}
