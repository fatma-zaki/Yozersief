import { eq, inArray, sql } from "drizzle-orm";
import { customers, messages, messageTemplates } from "@/db/schema";
import type { DbOrTx, Tx } from "@/db/tx";

export async function findTemplate(key: string, tx: DbOrTx) {
  const [row] = await tx.select().from(messageTemplates).where(eq(messageTemplates.key, key));
  return row ?? null;
}

export async function findTemplates(keys: readonly string[], tx: DbOrTx) {
  if (!keys.length) return [];
  return tx
    .select({ key: messageTemplates.key, body: messageTemplates.body })
    .from(messageTemplates)
    .where(inArray(messageTemplates.key, [...keys]));
}

export async function insertQueuedMessage(
  values: {
    orderId: string;
    customerId: string;
    templateId: number | null;
    body: string;
    sentBy: string | null;
  },
  tx: DbOrTx,
) {
  const [row] = await tx
    .insert(messages)
    .values({
      ...values,
      channel: "whatsapp",
      status: "prepared",
      nextAttemptAt: new Date(),
    })
    .returning({ id: messages.id });
  return row!;
}

/**
 * Claims due messages. `FOR UPDATE SKIP LOCKED` lets overlapping cron runs work in parallel
 * without sending the same message twice. Must run inside a transaction.
 */
export async function claimDueMessages(tx: Tx, limit: number) {
  const rows = await tx.execute<{
    id: string;
    order_id: string;
    body: string;
    attempts: number;
    phone: string;
    template_key: string | null;
  }>(sql`
    select m.id, m.order_id, m.body, m.attempts, c.phone, t.key as template_key
    from ${messages} m
    join ${customers} c on c.id = m.customer_id
    left join ${messageTemplates} t on t.id = m.template_id
    where m.status = 'prepared' and m.next_attempt_at is not null and m.next_attempt_at <= now()
    order by m.next_attempt_at
    limit ${limit}
    for update of m skip locked`);
  return rows.rows;
}

export async function markPrepared(id: string, tx: DbOrTx) {
  // Manual provider: no more automatic attempts; staff send it from the dashboard.
  await tx
    .update(messages)
    .set({ nextAttemptAt: null, attempts: sql`${messages.attempts} + 1`, lastError: null })
    .where(eq(messages.id, id));
}

export async function markSent(id: string, providerMessageId: string, tx: DbOrTx) {
  await tx
    .update(messages)
    .set({
      status: "sent",
      providerMessageId,
      nextAttemptAt: null,
      attempts: sql`${messages.attempts} + 1`,
      lastError: null,
    })
    .where(eq(messages.id, id));
}

export async function markAttemptFailed(
  id: string,
  attempts: number,
  nextAttemptAt: Date | null,
  error: string,
  tx: DbOrTx,
) {
  await tx
    .update(messages)
    .set({
      attempts,
      nextAttemptAt,
      lastError: error.slice(0, 500),
      ...(nextAttemptAt ? {} : { status: "failed" as const }),
    })
    .where(eq(messages.id, id));
}
