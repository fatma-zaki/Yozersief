import { db } from "@/db/client";
import { findTemplates } from "../infrastructure/outbox-repository";

/** Template bodies by key, for previews that must match what the outbox will render. */
export async function getTemplateBodies(keys: readonly string[]): Promise<Record<string, string>> {
  const rows = await findTemplates(keys, db);
  return Object.fromEntries(rows.map((r) => [r.key, r.body]));
}
