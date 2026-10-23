import { date, index, pgEnum, pgTable, smallint, uuid } from "drizzle-orm/pg-core";
import { money, timestamptz } from "./_columns";
import { staffUsers } from "./identity";
import { orders } from "./orders";

export const quoteStatus = pgEnum("quote_status", [
  "draft",
  "pending_admin",
  "sent",
  "accepted",
  "declined",
  "expired",
]);

/** The desk drafts, the admin approves, the customer accepts. */
export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    version: smallint("version").notNull(),
    unitPrice: money("unit_price").notNull(),
    total: money("total").notNull(),
    leadTimeDays: smallint("lead_time_days").notNull(),
    validUntil: date("valid_until"),
    status: quoteStatus("status").notNull(),
    preparedBy: uuid("prepared_by")
      .notNull()
      .references(() => staffUsers.id),
    approvedBy: uuid("approved_by").references(() => staffUsers.id, { onDelete: "set null" }),
    sentAt: timestamptz("sent_at"),
    acceptedAt: timestamptz("accepted_at"),
  },
  (t) => [
    index("quotes_order_id_idx").on(t.orderId),
    index("quotes_prepared_by_idx").on(t.preparedBy),
    index("quotes_approved_by_idx").on(t.approvedBy),
  ],
);
