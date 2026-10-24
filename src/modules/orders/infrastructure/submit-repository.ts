import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  customers,
  orderEvents,
  orderFiles,
  orderPrintPlaces,
  orderSizes,
  orders,
  organizationContacts,
  organizations,
  productCategories,
  products,
  uploadDrafts,
} from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx, Tx } from "@/db/tx";
import type { FileKind } from "../domain/files";
import type { CustomerType } from "../domain/lifecycle";

export async function findOrderRefByIdempotencyHash(
  hash: string,
  tx: DbOrTx = db,
): Promise<string | null> {
  const [row] = await tx
    .select({ ref: orders.ref })
    .from(orders)
    .where(eq(orders.idempotencyKeyHash, hash))
    .limit(1);
  return row?.ref ?? null;
}

export async function findCategoryIdByKey(key: string, tx: DbOrTx = db): Promise<number | null> {
  const [row] = await tx
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.key, key))
    .limit(1);
  return row?.id ?? null;
}

export async function findProductByKey(key: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ id: products.id, categoryId: products.categoryId, isVisible: products.isVisible })
    .from(products)
    .where(eq(products.key, key))
    .limit(1);
  return row ?? null;
}

/**
 * Find customer by phone or insert; updates name/email when they already exist.
 * Uses a single INSERT … ON CONFLICT so concurrent first-time submits on the same
 * phone cannot abort the transaction with a unique violation (23505).
 */
export async function upsertCustomerByPhone(
  input: { name: string; phone: string; email: string | null },
  tx: Tx,
): Promise<string> {
  const [row] = await tx
    .insert(customers)
    .values({ name: input.name, phone: input.phone, email: input.email })
    .onConflictDoUpdate({
      target: customers.phone,
      set: { name: input.name, email: input.email },
    })
    .returning({ id: customers.id });
  return row!.id;
}

export async function createOrganization(
  input: { name: string; type: "biz" | "group"; taxId: string | null },
  tx: Tx,
): Promise<string> {
  const [org] = await tx
    .insert(organizations)
    .values({ name: input.name, type: input.type, taxId: input.taxId })
    .returning({ id: organizations.id });
  return org!.id;
}

export async function linkOrganizationContact(
  input: { organizationId: string; customerId: string; title: string | null },
  tx: Tx,
): Promise<void> {
  await tx
    .insert(organizationContacts)
    .values({
      organizationId: input.organizationId,
      customerId: input.customerId,
      title: input.title,
    })
    .onConflictDoNothing();
}

export type InsertOrderValues = {
  ref: string;
  idempotencyKeyHash: string;
  customerId: string;
  organizationId: string | null;
  customerType: CustomerType;
  categoryId: number;
  productId: number | null;
  quantity: number | null;
  color: string | null;
  phoneModel: string | null;
  width: string | null;
  height: string | null;
  unit: string | null;
  shape: string | null;
  customText: string | null;
  description: string | null;
  notes: string | null;
  needsDesignHelp: boolean;
  designNotes: string | null;
  wantsSample: boolean;
  perPieceNames: boolean;
  batchedDelivery: boolean;
  batchNotes: string | null;
  needsInvoice: boolean;
  receiptMethod: "pickup" | "delivery";
  deliveryAddress: string | null;
  desiredDate: string | null;
};

/**
 * Inserts a submitted order. Uses `ON CONFLICT DO NOTHING` so a concurrent insert on
 * `idempotency_key_hash` or `ref` does not abort the transaction (Postgres 23505 would).
 * Returns `null` when a conflict skipped the insert — caller must resolve idempotency vs ref retry.
 */
export async function insertSubmittedOrder(
  values: InsertOrderValues,
  tx: Tx,
): Promise<{ id: string; ref: string } | null> {
  const [row] = await tx
    .insert(orders)
    .values({
      ...values,
      status: "submitted",
      bizStage: null,
    })
    .onConflictDoNothing()
    .returning({ id: orders.id, ref: orders.ref });
  return row ?? null;
}

export async function insertOrderSizes(
  orderId: string,
  sizes: { size: string; qty: number }[],
  tx: Tx,
): Promise<void> {
  if (!sizes.length) return;
  await tx.insert(orderSizes).values(sizes.map((s) => ({ orderId, size: s.size, qty: s.qty })));
}

export async function insertOrderPlaces(orderId: string, places: string[], tx: Tx): Promise<void> {
  if (!places.length) return;
  await tx.insert(orderPrintPlaces).values(places.map((place) => ({ orderId, place })));
}

export async function insertSubmittedEvent(orderId: string, tx: Tx): Promise<void> {
  await tx.insert(orderEvents).values({
    orderId,
    type: "submitted",
    titleAr: "تم استلام الطلب",
    note: null,
    visibleToCustomer: true,
    actorId: null,
  });
}

export type DraftFileRow = {
  id: string;
  kind: FileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

export async function listLiveDrafts(
  submissionKeyHash: string,
  tx: DbOrTx = db,
): Promise<DraftFileRow[]> {
  return tx
    .select({
      id: uploadDrafts.id,
      kind: uploadDrafts.kind,
      fileName: uploadDrafts.fileName,
      mimeType: uploadDrafts.mimeType,
      sizeBytes: uploadDrafts.sizeBytes,
      storageKey: uploadDrafts.storageKey,
    })
    .from(uploadDrafts)
    .where(
      and(
        eq(uploadDrafts.submissionKeyHash, submissionKeyHash),
        sql`${uploadDrafts.expiresAt} > now()`,
      ),
    );
}

export async function claimDraftsToOrder(
  orderId: string,
  drafts: DraftFileRow[],
  tx: Tx,
): Promise<void> {
  if (!drafts.length) return;
  await tx.insert(orderFiles).values(
    drafts.map((d) => ({
      orderId,
      kind: d.kind,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      storageKey: d.storageKey,
      uploadedBy: null,
    })),
  );
  await tx.delete(uploadDrafts).where(
    inArray(
      uploadDrafts.id,
      drafts.map((d) => d.id),
    ),
  );
}

export async function countDraftsForSubmission(
  submissionKeyHash: string,
  tx: DbOrTx = db,
): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(uploadDrafts)
    .where(eq(uploadDrafts.submissionKeyHash, submissionKeyHash));
  return row?.n ?? 0;
}

export async function insertUploadDraft(
  values: {
    submissionKeyHash: string;
    kind: Exclude<FileKind, "mockup">;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    expiresAt: Date;
  },
  tx: DbOrTx = db,
): Promise<{ id: string }> {
  const [row] = await tx
    .insert(uploadDrafts)
    .values(values)
    .onConflictDoNothing({ target: uploadDrafts.storageKey })
    .returning({ id: uploadDrafts.id });
  if (row) return row;
  const [existing] = await tx
    .select({ id: uploadDrafts.id })
    .from(uploadDrafts)
    .where(eq(uploadDrafts.storageKey, values.storageKey))
    .limit(1);
  return existing!;
}

export async function deleteExpiredUploadDrafts(tx: DbOrTx = db) {
  return tx
    .delete(uploadDrafts)
    .where(lt(uploadDrafts.expiresAt, sql`now()`))
    .returning({
      id: uploadDrafts.id,
      storageKey: uploadDrafts.storageKey,
    });
}

/** Unique violation on idempotency or ref (Postgres 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
