import { logActivity } from "@/modules/audit";
import { withTransaction, type Tx } from "@/db/tx";
import { isAppError, NotFoundError, ValidationError, type AppError } from "@/lib/errors";
import { assertCan, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import {
  newProductKey,
  optionRows,
  selectionFrom,
  type ColorValue,
  type PlaceValue,
  type SizeValue,
} from "../domain/admin-catalog";
import { isCategoryKey, type CategoryKey } from "../domain/categories";
import {
  findCategoryByKey,
  insertProduct,
  listCategories,
  listHiddenProductKeys,
  listOptionsFor,
  listProducts,
  lockProduct,
  replaceOptions,
  setProductVisible,
  updateProduct,
} from "../infrastructure/catalog-repository";
import {
  productVisibilitySchema,
  saveProductSchema,
  type ProductVisibilityInput,
  type SaveProductInput,
} from "../schemas";

/** One card on the products screen (docs/design/Admin-Products.html). */
export type AdminProductView = {
  id: number;
  name: string;
  categoryKey: CategoryKey;
  img: string;
  desc: string;
  colors: ColorValue[];
  sizes: SizeValue[];
  places: PlaceValue[];
  visible: boolean;
};

export type AdminCatalogData = {
  categories: { key: CategoryKey; name: string }[];
  products: AdminProductView[];
};

/** The products & services screen: every category and product, hidden ones included. */
export async function getAdminCatalog(actor: StaffContext): Promise<AdminCatalogData> {
  assertCan(actor, "catalog.manage");
  const [categoryRows, productRows] = await Promise.all([listCategories(), listProducts()]);
  const options = await listOptionsFor(productRows.map((p) => p.id));

  const categories = categoryRows.flatMap((c) =>
    isCategoryKey(c.key) ? [{ id: c.id, key: c.key, name: c.nameAr, img: c.imageUrl }] : [],
  );
  const byId = new Map(categories.map((c) => [c.id, c]));

  return {
    categories: categories.map(({ key, name }) => ({ key, name })),
    products: productRows.flatMap((p) => {
      const category = byId.get(p.categoryId);
      if (!category) return [];
      const sel = selectionFrom(options.filter((o) => o.productId === p.id));
      return [
        {
          id: p.id,
          name: p.nameAr,
          categoryKey: category.key,
          img: p.imageUrl ?? category.img,
          desc: p.description ?? "",
          colors: [...sel.colors],
          sizes: [...sel.sizes],
          places: [...sel.places],
          visible: p.isVisible,
        },
      ];
    }),
  };
}

/** Runs `fn` in a transaction; an AppError thrown inside rolls back and becomes `err`. */
async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await withTransaction(fn));
  } catch (error) {
    if (isAppError(error)) return err(error as AppError);
    throw error;
  }
}

const productNotFound = () =>
  new NotFoundError("product", "هذا المنتج غير موجود، ربما حُذف. حدّث الصفحة وحاول مرة أخرى.");

/** «إضافة المنتج» / «حفظ التعديلات» in the products drawer (brief B4: show/hide, describe, options). */
export async function saveProduct(
  actor: StaffContext,
  raw: SaveProductInput,
): Promise<Result<{ id: number; name: string; created: boolean }>> {
  assertCan(actor, "catalog.manage");
  const parsed = saveProductSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const first = Object.values(fieldErrors).flat()[0];
    return err(new ValidationError(fieldErrors, first));
  }
  const input = parsed.data;

  return inTransaction(async (tx) => {
    const category = await findCategoryByKey(input.categoryKey, tx);
    if (!category) {
      throw new ValidationError({ categoryKey: ["التصنيف غير موجود."] }, "التصنيف غير موجود.");
    }
    const fields = {
      categoryId: category.id,
      nameAr: input.name,
      description: input.description || null,
      isVisible: input.visible,
    };

    let id: number;
    if (input.id === null) {
      id = await insertProduct({ ...fields, key: newProductKey() }, tx);
    } else {
      const existing = await lockProduct(input.id, tx);
      if (!existing) throw productNotFound();
      id = existing.id;
      await updateProduct(id, fields, tx);
    }
    const rows = optionRows(input);
    await replaceOptions(id, rows, tx);

    await logActivity(tx, {
      userId: actor.id,
      action: input.id === null ? "catalog.product_created" : "catalog.product_updated",
      entityType: "product",
      entityId: String(id),
      meta: {
        name: input.name,
        category: input.categoryKey,
        visible: input.visible,
        options: rows.length,
      },
    });
    return { id, name: input.name, created: input.id === null };
  });
}

/** The «ظاهر في الموقع» switch: hides a product without deleting it. */
export async function setProductVisibility(
  actor: StaffContext,
  raw: ProductVisibilityInput,
): Promise<Result<{ name: string; visible: boolean }>> {
  assertCan(actor, "catalog.manage");
  const input = productVisibilitySchema.parse(raw);
  return inTransaction(async (tx) => {
    const existing = await lockProduct(input.id, tx);
    if (!existing) throw productNotFound();
    if (existing.isVisible !== input.visible) {
      await setProductVisible(existing.id, input.visible, tx);
      await logActivity(tx, {
        userId: actor.id,
        action: input.visible ? "catalog.product_shown" : "catalog.product_hidden",
        entityType: "product",
        entityId: String(existing.id),
        meta: { name: existing.nameAr },
      });
    }
    return { name: existing.nameAr, visible: input.visible };
  });
}

/** Public read for the request builder: product keys the admin hid. */
export async function getHiddenProductKeys(): Promise<string[]> {
  return listHiddenProductKeys();
}
