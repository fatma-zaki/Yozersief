import { and, asc, count, countDistinct, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  customers,
  orderEvents,
  orderFiles,
  orderPrintPlaces,
  orders,
  orderSizes,
  organizationContacts,
  organizations,
  productCategories,
  products,
} from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

/** Most recent orders with what the admin list and detail show (brief B7). */
export async function listAdminOrderRows(limit: number, tx: DbOrTx = db) {
  return tx
    .select({
      id: orders.id,
      ref: orders.ref,
      status: orders.status,
      bizStage: orders.bizStage,
      customerType: orders.customerType,
      createdAt: orders.createdAt,
      quantity: orders.quantity,
      color: orders.color,
      phoneModel: orders.phoneModel,
      width: orders.width,
      height: orders.height,
      unit: orders.unit,
      shape: orders.shape,
      customText: orders.customText,
      description: orders.description,
      notes: orders.notes,
      designNotes: orders.designNotes,
      needsDesignHelp: orders.needsDesignHelp,
      wantsSample: orders.wantsSample,
      perPieceNames: orders.perPieceNames,
      batchedDelivery: orders.batchedDelivery,
      needsInvoice: orders.needsInvoice,
      receiptMethod: orders.receiptMethod,
      deliveryAddress: orders.deliveryAddress,
      desiredDate: orders.desiredDate,
      internalNote: orders.internalNote,
      customerName: customers.name,
      customerPhone: customers.phone,
      orgName: organizations.name,
      orgRole: organizationContacts.title,
      categoryKey: productCategories.key,
      categoryName: productCategories.nameAr,
      productKey: products.key,
      productName: products.nameAr,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(productCategories, eq(productCategories.id, orders.categoryId))
    .leftJoin(products, eq(products.id, orders.productId))
    .leftJoin(organizations, eq(organizations.id, orders.organizationId))
    .leftJoin(
      organizationContacts,
      and(
        eq(organizationContacts.organizationId, orders.organizationId),
        eq(organizationContacts.customerId, orders.customerId),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export type AdminOrderRow = Awaited<ReturnType<typeof listAdminOrderRows>>[number];

export async function listSizesFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx.select().from(orderSizes).where(inArray(orderSizes.orderId, orderIds));
}

export async function listPlacesFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx.select().from(orderPrintPlaces).where(inArray(orderPrintPlaces.orderId, orderIds));
}

export async function listFilesFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({
      id: orderFiles.id,
      orderId: orderFiles.orderId,
      kind: orderFiles.kind,
      fileName: orderFiles.fileName,
      mimeType: orderFiles.mimeType,
      storageKey: orderFiles.storageKey,
      qualityFlag: orderFiles.qualityFlag,
    })
    .from(orderFiles)
    .where(inArray(orderFiles.orderId, orderIds))
    .orderBy(asc(orderFiles.createdAt));
}

/** Every timeline entry, customer-visible or not: staff see the full activity log. */
export async function listEventsFor(orderIds: string[], tx: DbOrTx = db) {
  if (!orderIds.length) return [];
  return tx
    .select({
      orderId: orderEvents.orderId,
      titleAr: orderEvents.titleAr,
      note: orderEvents.note,
      createdAt: orderEvents.createdAt,
    })
    .from(orderEvents)
    .where(inArray(orderEvents.orderId, orderIds))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
}

export async function countOrdersInStatus(
  status: (typeof orders.status.enumValues)[number],
  tx: DbOrTx = db,
) {
  const [row] = await tx.select({ n: count() }).from(orders).where(eq(orders.status, status));
  return row?.n ?? 0;
}

/** Orders that got an event of one of these types since `since` (the «آخر 7 أيام» cards). */
export async function countOrdersWithEventSince(types: string[], since: Date, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ n: countDistinct(orderEvents.orderId) })
    .from(orderEvents)
    .where(and(inArray(orderEvents.type, types), gte(orderEvents.createdAt, since)));
  return row?.n ?? 0;
}

export async function updateInternalNote(orderId: string, note: string | null, tx: DbOrTx) {
  const rows = await tx
    .update(orders)
    .set({ internalNote: note, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });
  return rows.length > 0;
}

/** «تعديل الطلب»: the changed detail columns, and a new size split / print places when given. */
export async function updateOrderDetails(
  orderId: string,
  patch: Partial<typeof orders.$inferInsert>,
  lists: { sizes: { size: string; qty: number }[] | null; places: string[] | null },
  tx: DbOrTx,
) {
  await tx
    .update(orders)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  if (lists.sizes) {
    await tx.delete(orderSizes).where(eq(orderSizes.orderId, orderId));
    if (lists.sizes.length)
      await tx.insert(orderSizes).values(lists.sizes.map((s) => ({ orderId, ...s })));
  }
  if (lists.places) {
    await tx.delete(orderPrintPlaces).where(eq(orderPrintPlaces.orderId, orderId));
    if (lists.places.length)
      await tx.insert(orderPrintPlaces).values(lists.places.map((place) => ({ orderId, place })));
  }
}

export async function findCustomerContact(customerId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ name: customers.name, phone: customers.phone })
    .from(customers)
    .where(eq(customers.id, customerId));
  return row ?? null;
}

export async function findOrgName(orderId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ name: organizations.name })
    .from(orders)
    .innerJoin(organizations, eq(organizations.id, orders.organizationId))
    .where(eq(orders.id, orderId));
  return row?.name ?? null;
}

export async function countOrdersCreatedBetween(from: Date, to: Date, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ n: count() })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lt(orders.createdAt, to)));
  return row?.n ?? 0;
}

export async function countOrdersWithEventBetween(
  types: string[],
  from: Date,
  to: Date,
  tx: DbOrTx = db,
) {
  const [row] = await tx
    .select({ n: countDistinct(orderEvents.orderId) })
    .from(orderEvents)
    .where(
      and(
        inArray(orderEvents.type, types),
        gte(orderEvents.createdAt, from),
        lt(orderEvents.createdAt, to),
      ),
    );
  return row?.n ?? 0;
}
