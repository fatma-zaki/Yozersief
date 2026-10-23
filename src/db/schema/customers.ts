import { pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";

export const orgType = pgEnum("org_type", ["biz", "group"]);
export const customerType = pgEnum("customer_type", ["person", "biz", "group"]);

/** Everyone who placed an order. No account; identified by mobile (brief B2). */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  createdAt: createdAt(),
});

/** A company, shop, team, school, event or occasion. */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: orgType("type").notNull(),
  taxId: text("tax_id"),
  createdAt: createdAt(),
});

/** Who speaks for the organisation, and their title. */
export const organizationContacts = pgTable(
  "organization_contacts",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    title: text("title"),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.customerId] })],
);
