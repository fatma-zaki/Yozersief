import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, money, timestamptz } from "./_columns";
import { productCategories, products } from "./catalog";
import { customers, customerType, organizations } from "./customers";
import { staffUsers } from "./identity";

export const orderStatus = pgEnum("order_status", [
  "submitted",
  "in_review",
  "awaiting_customer",
  "approved",
  "rejected",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
]);
export const bizStage = pgEnum("biz_stage", [
  "quote",
  "customer_approval",
  "mockup",
  "deposit",
  "production",
  "qc",
  "delivery",
  "done",
]);
export const receiptMethod = pgEnum("receipt_method", ["pickup", "delivery"]);
export const fileKind = pgEnum("file_kind", ["design", "reference", "names_sheet", "mockup"]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    customerType: customerType("customer_type").notNull(),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => productCategories.id),
    productId: smallint("product_id").references(() => products.id, { onDelete: "set null" }),
    status: orderStatus("status").notNull(),
    bizStage: bizStage("biz_stage"),
    quantity: integer("quantity"),
    color: text("color"),
    phoneModel: text("phone_model"),
    width: numeric("width"),
    height: numeric("height"),
    unit: text("unit"),
    shape: text("shape"),
    customText: text("custom_text"),
    description: text("description"),
    notes: text("notes"),
    needsDesignHelp: boolean("needs_design_help").notNull().default(false),
    designNotes: text("design_notes"),
    wantsSample: boolean("wants_sample").notNull().default(false),
    perPieceNames: boolean("per_piece_names").notNull().default(false),
    batchedDelivery: boolean("batched_delivery").notNull().default(false),
    batchNotes: text("batch_notes"),
    needsInvoice: boolean("needs_invoice").notNull().default(false),
    receiptMethod: receiptMethod("receipt_method").notNull(),
    deliveryAddress: text("delivery_address"),
    desiredDate: date("desired_date"),
    finalPrice: money("final_price"),
    promisedDate: date("promised_date"),
    assignedTo: uuid("assigned_to").references(() => staffUsers.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
    internalNote: text("internal_note"),
    createdAt: createdAt(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_organization_id_idx").on(t.organizationId),
    index("orders_category_id_idx").on(t.categoryId),
    index("orders_product_id_idx").on(t.productId),
    index("orders_assigned_to_idx").on(t.assignedTo),
    index("orders_status_created_at_idx").on(t.status, t.createdAt.desc()),
    check("orders_ref_format", sql`${t.ref} ~ '^YZ-[A-Z0-9]{6}$'`),
    check(
      "orders_org_when_biz",
      sql`(${t.customerType} = 'person') = (${t.organizationId} IS NULL)`,
    ),
  ],
);

/** Size split; the sum must equal orders.quantity (enforced in the domain). */
export const orderSizes = pgTable(
  "order_sizes",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orderId, t.size] }),
    check("order_sizes_qty_pos", sql`${t.qty} > 0`),
  ],
);

export const orderPrintPlaces = pgTable(
  "order_print_places",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    place: text("place").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.place] })],
);

/** Customer files, references, names sheets and mockups. uploaded_by null = the customer. */
export const orderFiles = pgTable(
  "order_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: fileKind("kind").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    qualityFlag: text("quality_flag"),
    uploadedBy: uuid("uploaded_by").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("order_files_order_id_idx").on(t.orderId),
    index("order_files_uploaded_by_idx").on(t.uploadedBy),
  ],
);

/** One row per piece from the names sheet; production ticks them off. */
export const orderPieces = pgTable(
  "order_pieces",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    nameText: text("name_text"),
    numberText: text("number_text"),
    size: text("size"),
    printedAt: timestamptz("printed_at"),
  },
  (t) => [index("order_pieces_order_id_idx").on(t.orderId)],
);

/** Timeline entries. Only rows with visible_to_customer are ever shown on tracking. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    titleAr: text("title_ar").notNull(),
    note: text("note"),
    visibleToCustomer: boolean("visible_to_customer").notNull().default(false),
    actorId: uuid("actor_id").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("order_events_order_id_idx").on(t.orderId),
    index("order_events_actor_id_idx").on(t.actorId),
    index("order_events_order_id_created_at_idx").on(t.orderId, t.createdAt.desc()),
  ],
);
