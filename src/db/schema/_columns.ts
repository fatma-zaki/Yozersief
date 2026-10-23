import { numeric, timestamp } from "drizzle-orm/pg-core";

/** timestamptz stored in UTC, read as Date. */
export const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const createdAt = () => timestamptz("created_at").notNull().defaultNow();

/** numeric(12,2) money, handled as a string in TS (brief A5). */
export const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
