/**
 * What customers see of the catalog: the home «منتجاتنا» section and the request builder's
 * category and product choices (brief B4, B5). Pure.
 *
 * A category is offered when it is visible and either has no products of its own (phone,
 * sticker, custom in B4) or still has at least one visible product — hiding a category's last
 * product in the dashboard takes the category off the site.
 */
import { isCategoryKey, type CategoryKey } from "./categories";

export type PublicProduct = {
  key: string;
  name: string;
  description: string;
  img: string;
};

export type PublicCategory = {
  key: CategoryKey;
  name: string;
  /** Card text for a dashboard service; null for the B4 categories (their text is in i18n). */
  description: string | null;
  img: string;
  products: PublicProduct[];
};

export type CategoryRow = {
  id: number;
  key: string;
  nameAr: string;
  description: string | null;
  imageUrl: string;
  isVisible: boolean;
};

export type ProductRow = {
  key: string;
  categoryId: number;
  nameAr: string;
  description: string | null;
  imageUrl: string | null;
  isVisible: boolean;
};

/** Categories in sort order (the rows come sorted), each with its visible products. */
export function buildPublicCatalog(
  categories: readonly CategoryRow[],
  products: readonly ProductRow[],
): PublicCategory[] {
  return categories.flatMap((c) => {
    if (!c.isVisible || !isCategoryKey(c.key)) return [];
    const own = products.filter((p) => p.categoryId === c.id);
    const visible = own.filter((p) => p.isVisible);
    if (own.length > 0 && visible.length === 0) return [];
    return [
      {
        key: c.key,
        name: c.nameAr,
        description: c.description,
        img: c.imageUrl,
        products: visible.map((p) => ({
          key: p.key,
          name: p.nameAr,
          description: p.description ?? "",
          img: p.imageUrl ?? c.imageUrl,
        })),
      },
    ];
  });
}
