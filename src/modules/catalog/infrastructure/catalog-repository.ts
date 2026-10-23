import { asc, eq, inArray } from "drizzle-orm";
import { productCategories, productOptions, products } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx, Tx } from "@/db/tx";
import type { OptionRow } from "../domain/admin-catalog";

export async function listCategories(tx: DbOrTx = db) {
  return tx
    .select({
      id: productCategories.id,
      key: productCategories.key,
      nameAr: productCategories.nameAr,
      imageUrl: productCategories.imageUrl,
    })
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder));
}

/** Every product, newest edits last within a category (the admin screen sorts by category). */
export async function listProducts(tx: DbOrTx = db) {
  return tx
    .select({
      id: products.id,
      key: products.key,
      categoryId: products.categoryId,
      nameAr: products.nameAr,
      description: products.description,
      imageUrl: products.imageUrl,
      isVisible: products.isVisible,
    })
    .from(products)
    .innerJoin(productCategories, eq(productCategories.id, products.categoryId))
    .orderBy(asc(productCategories.sortOrder), asc(products.id));
}

export async function listOptionsFor(productIds: number[], tx: DbOrTx = db) {
  if (!productIds.length) return [];
  return tx
    .select({
      productId: productOptions.productId,
      type: productOptions.type,
      value: productOptions.value,
    })
    .from(productOptions)
    .where(inArray(productOptions.productId, productIds))
    .orderBy(asc(productOptions.sortOrder));
}

export async function findCategoryByKey(key: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.key, key));
  return row ?? null;
}

export async function lockProduct(id: number, tx: Tx) {
  const [row] = await tx
    .select({ id: products.id, nameAr: products.nameAr, isVisible: products.isVisible })
    .from(products)
    .where(eq(products.id, id))
    .for("update");
  return row ?? null;
}

type ProductFields = {
  categoryId: number;
  nameAr: string;
  description: string | null;
  isVisible: boolean;
};

export async function insertProduct(fields: ProductFields & { key: string }, tx: Tx) {
  const [row] = await tx.insert(products).values(fields).returning({ id: products.id });
  return row!.id;
}

export async function updateProduct(id: number, fields: ProductFields, tx: Tx) {
  await tx
    .update(products)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(products.id, id));
}

export async function setProductVisible(id: number, isVisible: boolean, tx: Tx) {
  await tx.update(products).set({ isVisible, updatedAt: new Date() }).where(eq(products.id, id));
}

/** The drawer edits the whole option set at once, so it is replaced, not patched. */
export async function replaceOptions(productId: number, rows: OptionRow[], tx: Tx) {
  await tx.delete(productOptions).where(eq(productOptions.productId, productId));
  if (rows.length) {
    await tx.insert(productOptions).values(rows.map((r) => ({ ...r, productId })));
  }
}

/** Keys the admin hid; the request builder leaves them out (brief B4). */
export async function listHiddenProductKeys(tx: DbOrTx = db) {
  const rows = await tx
    .select({ key: products.key })
    .from(products)
    .where(eq(products.isVisible, false));
  return rows.map((r) => r.key);
}
