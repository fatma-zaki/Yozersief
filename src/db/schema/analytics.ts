import { bigint, boolean, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";

/**
 * First-party page views for the traffic dashboard (ADR-0008). No cookies and no IP: a visitor
 * is an HMAC of IP + user agent with a salt that changes every Cairo day, so a visitor cannot be
 * followed across days or linked back to a person.
 */
export const pageViews = pgTable(
  "page_views",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
    /** Normalised path: no query string, order refs and link tokens replaced by placeholders. */
    path: text("path").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    /** First view of a visit (no view from this visitor in the previous 30 minutes). */
    isEntry: boolean("is_entry").notNull(),
    /** instagram · facebook · tiktok · whatsapp · google · direct · other (set on every view). */
    source: text("source").notNull(),
    /** mobile · tablet · desktop */
    device: text("device").notNull(),
  },
  (t) => [
    index("page_views_created_at_idx").on(t.createdAt),
    index("page_views_visitor_created_idx").on(t.visitorHash, t.createdAt),
  ],
);
