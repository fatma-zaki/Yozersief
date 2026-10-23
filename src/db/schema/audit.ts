import { bigint, boolean, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { staffUsers } from "./identity";
import { orders } from "./orders";

/** Team activity seen by the admin, including sensitive-data access (is_sensitive). */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id").references(() => staffUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_logs_user_id_idx").on(t.userId),
    index("activity_logs_order_id_idx").on(t.orderId),
    index("activity_logs_user_id_created_at_idx").on(t.userId, t.createdAt.desc()),
  ],
);
