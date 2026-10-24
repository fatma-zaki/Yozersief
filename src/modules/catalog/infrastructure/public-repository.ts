import { asc, eq } from "drizzle-orm";
import { productCategories, products } from "@/db/schema";
import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";

/** Every category with its visibility, in sort order. */
export async function listCategoriesWithVisibility(tx: DbOrTx = db) {
  return tx
    .select({
      id: productCategories.id,
      key: productCategories.key,
      nameAr: productCategories.nameAr,
      imageUrl: productCategories.imageUrl,
      isVisible: productCategories.isVisible,
    })
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder));
}

/** Every product (visible or not: a hidden last product hides its category), stable order. */
export async function listProductsForPublic(tx: DbOrTx = db) {
  return tx
    .select({
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
