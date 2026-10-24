import { boolean, index, integer, pgEnum, pgTable, smallint, text } from "drizzle-orm/pg-core";
import { timestamptz } from "./_columns";

export const optionType = pgEnum("option_type", ["color", "size", "place"]);

/** wear · mug · phone · sticker · custom */
export const productCategories = pgTable("product_categories", {
  id: smallint("id").primaryKey().generatedByDefaultAsIdentity(),
  key: text("key").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  imageUrl: text("image_url").notNull(),
  sortOrder: smallint("sort_order").notNull(),
  isVisible: boolean("is_visible").notNull().default(false),
});

/** tshirt, hoodie, sweat, cap, mug, bottle… Prices are never shown to customers. */
export const products = pgTable(
  "products",
  {
    id: smallint("id").primaryKey().generatedByDefaultAsIdentity(),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => productCategories.id),
    key: text("key").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    description: text("description"),
    /** Product photo; null falls back to the category image. */
    imageUrl: text("image_url"),
    isVisible: boolean("is_visible").notNull().default(false),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("products_category_id_idx").on(t.categoryId)],
);

/** Colours, sizes and print places available per product. */
export const productOptions = pgTable(
  "product_options",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    productId: smallint("product_id")
      .notNull()
      .references(() => products.id),
    type: optionType("type").notNull(),
    value: text("value").notNull(),
    labelAr: text("label_ar").notNull(),
    sortOrder: smallint("sort_order").notNull(),
  },
  (t) => [index("product_options_product_id_idx").on(t.productId)],
);
