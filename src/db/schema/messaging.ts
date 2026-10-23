import { index, integer, pgEnum, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, timestamptz } from "./_columns";
import { customers } from "./customers";
import { staffUsers } from "./identity";
import { orders } from "./orders";

export const messageStatus = pgEnum("message_status", ["prepared", "sent", "delivered", "failed"]);

/** approve · info · reject · ready · quote · update · thanks. Body uses {name} {ref} {link}… */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: smallint("id").primaryKey().generatedByDefaultAsIdentity(),
    key: text("key").notNull().unique(),
    body: text("body").notNull(),
    updatedBy: uuid("updated_by").references(() => staffUsers.id, { onDelete: "set null" }),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("message_templates_updated_by_idx").on(t.updatedBy)],
);

/**
 * Every prepared or sent message; doubles as the outbox (ADR-0004).
 * `attempts`, `next_attempt_at` and `last_error` are outbox bookkeeping, not in docs/schema.sql.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    templateId: smallint("template_id").references(() => messageTemplates.id, {
      onDelete: "set null",
    }),
    channel: text("channel").notNull(),
    body: text("body").notNull(),
    status: messageStatus("status").notNull(),
    providerMessageId: text("provider_message_id"),
    sentBy: uuid("sent_by").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    // Outbox bookkeeping
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamptz("next_attempt_at"),
    lastError: text("last_error"),
  },
  (t) => [
    index("messages_order_id_idx").on(t.orderId),
    index("messages_customer_id_idx").on(t.customerId),
    index("messages_template_id_idx").on(t.templateId),
    index("messages_sent_by_idx").on(t.sentBy),
    index("messages_status_next_attempt_at_idx").on(t.status, t.nextAttemptAt),
  ],
);
