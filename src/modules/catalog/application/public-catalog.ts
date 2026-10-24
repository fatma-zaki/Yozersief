import { cacheLife, cacheTag, updateTag } from "next/cache";
import { buildPublicCatalog, type PublicCategory } from "../domain/public-catalog";
import {
  listCategoriesWithVisibility,
  listProductsForPublic,
} from "../infrastructure/public-repository";

export const PUBLIC_CATALOG_TAG = "catalog:public";

/**
 * The catalog customers see (home «منتجاتنا», request builder). Public data, no permission;
 * cached and invalidated by the dashboard's catalog actions.
 */
export async function getPublicCatalog(): Promise<PublicCategory[]> {
  "use cache";
  cacheTag(PUBLIC_CATALOG_TAG);
  cacheLife("minutes");
  const [categories, products] = await Promise.all([
    listCategoriesWithVisibility(),
    listProductsForPublic(),
  ]);
  return buildPublicCatalog(categories, products);
}

/** Call from the server actions that edit products or categories. */
export function invalidatePublicCatalog(): void {
  updateTag(PUBLIC_CATALOG_TAG);
}
