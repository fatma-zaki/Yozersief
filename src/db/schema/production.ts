import { boolean, index, integer, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";
import { timestamptz } from "./_columns";
import { staffUsers } from "./identity";
import { orders } from "./orders";

export const productionStage = pgEnum("production_stage", ["queue", "printing", "qc", "ready"]);

/** One production job per order: stage, counter and QC checklist. */
export const productionJobs = pgTable(
  "production_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    stage: productionStage("stage").notNull(),
    printedCount: integer("printed_count").notNull(),
    qcSizesOk: boolean("qc_sizes_ok").notNull().default(false),
    qcNamesOk: boolean("qc_names_ok").notNull().default(false),
    qcPrintOk: boolean("qc_print_ok").notNull().default(false),
    qcCountOk: boolean("qc_count_ok").notNull().default(false),
    operatorId: uuid("operator_id").references(() => staffUsers.id, { onDelete: "set null" }),
    startedAt: timestamptz("started_at"),
    finishedAt: timestamptz("finished_at"),
  },
  (t) => [index("production_jobs_operator_id_idx").on(t.operatorId)],
);
