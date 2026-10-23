import { index, integer, pgEnum, pgTable, smallint, uuid } from "drizzle-orm/pg-core";
import { timestamptz } from "./_columns";
import { staffUsers } from "./identity";
import { orders } from "./orders";

export const deliveryStatus = pgEnum("delivery_status", ["ready", "delivered"]);

/** Handover, in one go or in batches. */
export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    batchNo: smallint("batch_no").notNull(),
    quantity: integer("quantity").notNull(),
    status: deliveryStatus("status").notNull(),
    /** Wrong "last 3 phone digits" attempts at handover. */
    failedCodeAttempts: smallint("failed_code_attempts").notNull(),
    deliveredBy: uuid("delivered_by").references(() => staffUsers.id, { onDelete: "set null" }),
    deliveredAt: timestamptz("delivered_at"),
  },
  (t) => [
    index("deliveries_order_id_idx").on(t.orderId),
    index("deliveries_delivered_by_idx").on(t.deliveredBy),
  ],
);
