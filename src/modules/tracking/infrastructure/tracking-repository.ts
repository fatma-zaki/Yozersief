import { and, desc, eq } from "drizzle-orm";
import { customers, orderEvents, orders } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";
import { safeEqual } from "@/lib/tokens";
import type { OrderRowForCustomerView, EventRowForCustomerView } from "../domain/customer-view";

export type OrderPhoneMatch = {
  orderId: string;
  ref: string;
};

/**
 * Same length as a normalised Egyptian mobile (`01xxxxxxxxx`). Not a valid
 * carrier prefix — used only so a missing-ref path still runs `safeEqual`.
 * This reduces a cheap timing oracle; it does **not** make the full lookup
 * constant-time (DB latency still differs). Rate limits remain the real control.
 */
const PHONE_COMPARE_PAD = "00000000000";

/**
 * Finds an order by canonical ref and checks the registered customer phone.
 * Returns null for missing order or phone mismatch (same outcome — no enumeration).
 * Never returns the phone to callers.
 */
export async function findOrderMatchingPhone(
  ref: string,
  normalizedPhone: string,
  tx: DbOrTx = db,
): Promise<OrderPhoneMatch | null> {
  const [row] = await tx
    .select({
      orderId: orders.id,
      ref: orders.ref,
      phone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.ref, ref))
    .limit(1);

  const storedPhone = row?.phone ?? PHONE_COMPARE_PAD;
  const phoneOk = safeEqual(storedPhone, normalizedPhone);
  if (!row || !phoneOk) return null;
  return { orderId: row.orderId, ref: row.ref };
}

export async function loadOrderForCustomerView(
  orderId: string,
  tx: DbOrTx = db,
): Promise<OrderRowForCustomerView | null> {
  const [row] = await tx
    .select({
      id: orders.id,
      ref: orders.ref,
      status: orders.status,
      bizStage: orders.bizStage,
      customerType: orders.customerType,
      createdAt: orders.createdAt,
      desiredDate: orders.desiredDate,
      receiptMethod: orders.receiptMethod,
      rejectionReason: orders.rejectionReason,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return row ?? null;
}

/** Customer-visible timeline only (`visible_to_customer = true`), newest first. */
export async function loadCustomerVisibleEvents(
  orderId: string,
  tx: DbOrTx = db,
): Promise<EventRowForCustomerView[]> {
  return tx
    .select({
      id: orderEvents.id,
      titleAr: orderEvents.titleAr,
      note: orderEvents.note,
      createdAt: orderEvents.createdAt,
      visibleToCustomer: orderEvents.visibleToCustomer,
    })
    .from(orderEvents)
    .where(and(eq(orderEvents.orderId, orderId), eq(orderEvents.visibleToCustomer, true)))
    .orderBy(desc(orderEvents.createdAt), desc(orderEvents.id));
}
