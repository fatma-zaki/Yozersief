import { index, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, timestamptz } from "./_columns";
import { orders } from "./orders";

/** The link in the WhatsApp message. Only the token hash is stored. */
export const trackingLinks = pgTable(
  "tracking_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamptz("expires_at"),
    lastOpenedAt: timestamptz("last_opened_at"),
    createdAt: createdAt(),
  },
  (t) => [index("tracking_links_order_id_idx").on(t.orderId)],
);

/** The 6-digit code sent before showing an order. Only the hash is stored. */
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: smallint("attempts").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    verifiedAt: timestamptz("verified_at"),
  },
  (t) => [index("verification_codes_order_id_idx").on(t.orderId)],
);
