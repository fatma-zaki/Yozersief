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
import { isCategoryKey, isServiceKey, newServiceKey, type CategoryKey } from "../domain/categories";
import {
  findCategoryByKey,
  insertCategory,
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
  createServiceSchema,
  productVisibilitySchema,
  saveProductSchema,
  type CreateServiceInput,
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
  /** `service`: added from the dashboard, with no product types of its own. */
  categories: { key: CategoryKey; name: string; service: boolean; visible: boolean }[];
  products: AdminProductView[];
};

/** The products & services screen: every category and product, hidden ones included. */
export async function getAdminCatalog(actor: StaffContext): Promise<AdminCatalogData> {
  assertCan(actor, "catalog.manage");
  const [categoryRows, productRows] = await Promise.all([listCategories(), listProducts()]);
  const options = await listOptionsFor(productRows.map((p) => p.id));

  const categories = categoryRows.flatMap((c) =>
    isCategoryKey(c.key)
      ? [{ id: c.id, key: c.key, name: c.nameAr, img: c.imageUrl, visible: c.isVisible }]
      : [],
  );
  const byId = new Map(categories.map((c) => [c.id, c]));

  return {
    categories: categories.map(({ key, name, visible }) => ({
      key,
      name,
      service: isServiceKey(key),
      visible,
    })),
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

/** A new service's photo until photo upload is wired (products share the same gap). */
const SERVICE_IMAGE = "/images/categories/custom.jpg";

/**
 * «إضافة خدمة»: a new service on the home page and in the request builder. It has no product
 * types; customers ordering it give a quantity and describe what they want.
 */
export async function createService(
  actor: StaffContext,
  raw: CreateServiceInput,
): Promise<Result<{ key: string; name: string }>> {
  assertCan(actor, "catalog.manage");
  const parsed = createServiceSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const first = Object.values(fieldErrors).flat()[0];
    return err(new ValidationError(fieldErrors, first));
  }
  const input = parsed.data;
  return inTransaction(async (tx) => {
    const key = newServiceKey();
    const id = await insertCategory(
      {
        key,
        nameAr: input.name,
        description: input.description,
        imageUrl: SERVICE_IMAGE,
        isVisible: input.visible,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "catalog.service_created",
      entityType: "product_category",
      entityId: String(id),
      meta: { key, name: input.name, visible: input.visible },
    });
    return { key, name: input.name };
  });
}

/** Public read for the request builder: product keys the admin hid. */
export async function getHiddenProductKeys(): Promise<string[]> {
  return listHiddenProductKeys();
}
