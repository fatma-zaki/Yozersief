import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, money, timestamptz } from "./_columns";
import { organizations } from "./customers";
import { staffUsers } from "./identity";
import { orders } from "./orders";

export const paymentKind = pgEnum("payment_kind", ["deposit", "balance", "full"]);
export const paymentStatus = pgEnum("payment_status", ["pending_admin", "confirmed", "rejected"]);

/** Deposits and balances. Every payment waits for admin confirmation. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: paymentKind("kind").notNull(),
    amount: money("amount").notNull(),
    /** cash · transfer [pending, B13 #1] */
    method: text("method").notNull(),
    status: paymentStatus("status").notNull(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => staffUsers.id),
    confirmedBy: uuid("confirmed_by").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    confirmedAt: timestamptz("confirmed_at"),
  },
  (t) => [
    index("payments_order_id_idx").on(t.orderId),
    index("payments_recorded_by_idx").on(t.recordedBy),
    index("payments_confirmed_by_idx").on(t.confirmedBy),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    number: text("number").notNull().unique(),
    /** [pending, B13 #2] regular or e-invoice */
    type: text("type").notNull(),
    total: money("total").notNull(),
    issuedBy: uuid("issued_by")
      .notNull()
      .references(() => staffUsers.id),
    issuedAt: timestamptz("issued_at").notNull(),
  },
  (t) => [
    index("invoices_order_id_idx").on(t.orderId),
    index("invoices_organization_id_idx").on(t.organizationId),
    index("invoices_issued_by_idx").on(t.issuedBy),
  ],
);
