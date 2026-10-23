import { index, pgEnum, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { timestamptz } from "./_columns";
import { staffUsers } from "./identity";
import { orderFiles, orders } from "./orders";

export const mockupStatus = pgEnum("mockup_status", [
  "with_desk",
  "sent",
  "approved",
  "changes_requested",
]);

export const mockups = pgTable(
  "mockups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    version: smallint("version").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => orderFiles.id),
    status: mockupStatus("status").notNull(),
    customerFeedback: text("customer_feedback"),
    designerId: uuid("designer_id")
      .notNull()
      .references(() => staffUsers.id),
    sentAt: timestamptz("sent_at"),
    decidedAt: timestamptz("decided_at"),
  },
  (t) => [
    index("mockups_order_id_idx").on(t.orderId),
    index("mockups_file_id_idx").on(t.fileId),
    index("mockups_designer_id_idx").on(t.designerId),
  ],
);
