import { z } from "zod";
import { COLOR_VALUES, OPTION_CHOICES, PLACE_VALUES, SIZE_VALUES } from "./domain/admin-catalog";
import { isCategoryKey, type CategoryKey } from "./domain/categories";

/**
 * Client-safe entry point: the request builder, the products drawer and pure domain code import
 * from here, since the module index also carries the database-backed use cases.
 */
export { OPTION_CHOICES };
export { WEAR_SIZES } from "./domain/catalog-seed";
export {
  CATEGORY_KEYS,
  isBuiltinCategoryKey,
  isCategoryKey,
  isServiceKey,
  type BuiltinCategoryKey,
  type CategoryKey,
  type ServiceKey,
} from "./domain/categories";

const productId = z.number().int().positive();

/** «إضافة منتج» (id null) or «حفظ التعديلات» in the products drawer. */
export const saveProductSchema = z.object({
  id: productId.nullable(),
  name: z
    .string()
    .trim()
    .min(2, "اكتب اسم المنتج.")
    .max(80, "اسم المنتج طويل، اجعله أقل من 80 حرفًا."),
  categoryKey: z
    .string({ error: "اختر التصنيف." })
    .refine((v): v is CategoryKey => isCategoryKey(v), "اختر التصنيف."),
  description: z.string().trim().max(300, "الوصف طويل، اجعله أقل من 300 حرف.").default(""),
  colors: z.array(z.enum(COLOR_VALUES)).max(COLOR_VALUES.length).default([]),
  sizes: z.array(z.enum(SIZE_VALUES)).max(SIZE_VALUES.length).default([]),
  places: z.array(z.enum(PLACE_VALUES)).max(PLACE_VALUES.length).default([]),
  visible: z.boolean(),
});
export type SaveProductInput = z.input<typeof saveProductSchema>;

/** «إضافة خدمة»: a new service on the home page and in the request builder. */
export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اكتب اسم الخدمة.")
    .max(60, "اسم الخدمة طويل، اجعله أقل من 60 حرفًا."),
  description: z
    .string()
    .trim()
    .min(10, "اكتب وصفًا قصيرًا للخدمة (10 أحرف على الأقل).")
    .max(200, "الوصف طويل، اجعله أقل من 200 حرف."),
  visible: z.boolean(),
});
export type CreateServiceInput = z.input<typeof createServiceSchema>;

/** The «ظاهر في الموقع» switch on a product card. */
export const productVisibilitySchema = z.object({ id: productId, visible: z.boolean() });
export type ProductVisibilityInput = z.input<typeof productVisibilitySchema>;
