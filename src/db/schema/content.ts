import { boolean, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, timestamptz } from "./_columns";
import { customers } from "./customers";
import { staffUsers } from "./identity";
import { orders } from "./orders";

/** "Our work" photos. Publishing is blocked without customer consent. */
export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    customerConsent: boolean("customer_consent").notNull().default(false),
    consentAt: timestamptz("consent_at"),
    isPublished: boolean("is_published").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => staffUsers.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("gallery_items_order_id_idx").on(t.orderId),
    index("gallery_items_created_by_idx").on(t.createdBy),
  ],
);

/** Real reviews, shown only with consent. Never fabricated. */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    body: text("body").notNull(),
    customerConsent: boolean("customer_consent").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("reviews_order_id_idx").on(t.orderId),
    index("reviews_customer_id_idx").on(t.customerId),
  ],
);

/** hero.title · contact.whatsapp … */
export const siteContent = pgTable(
  "site_content",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedBy: uuid("updated_by").references(() => staffUsers.id, { onDelete: "set null" }),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("site_content_updated_by_idx").on(t.updatedBy)],
);

/** security.two_factor · security.new_device_alert · security.timeout … */
export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedBy: uuid("updated_by").references(() => staffUsers.id, { onDelete: "set null" }),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("settings_updated_by_idx").on(t.updatedBy)],
);
