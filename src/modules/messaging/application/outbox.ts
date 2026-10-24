import { db } from "@/db/client";
import type { DbOrTx } from "@/db/tx";
import { logger } from "@/lib/logger";
import { nextAttemptAt, renderTemplate, type TemplateVars } from "../domain/template";
import {
  claimDueMessages,
  findTemplate,
  insertQueuedMessage,
  markAttemptFailed,
  markPrepared,
  markSent,
} from "../infrastructure/outbox-repository";
import type { MessagingProvider } from "./ports";

/**
 * Transactional outbox (brief A6.6, ADR-0004). Use cases call `enqueueMessage` with their own
 * transaction, so the message exists only if the state change committed. The cron worker sends.
 */
export async function enqueueMessage(
  tx: DbOrTx,
  input: {
    orderId: string;
    customerId: string;
    templateKey: string;
    vars: TemplateVars;
    actorId: string | null;
    /** Staff-edited text from the preview; overrides the rendered template. */
    bodyOverride?: string;
  },
) {
  const template = await findTemplate(input.templateKey, tx);
  if (!template) throw new Error(`message template "${input.templateKey}" not found`);
  const body = input.bodyOverride?.trim() || renderTemplate(template.body, input.vars);
  const row = await insertQueuedMessage(
    {
      orderId: input.orderId,
      customerId: input.customerId,
      templateId: template.id,
      body,
      sentBy: input.actorId,
    },
    tx,
  );
  // The body is returned so the caller can hand staff a wa.me link (manual provider).
  return { id: row.id, body };
}

export type DispatchSummary = { claimed: number; sent: number; prepared: number; failed: number };

/** Cron worker: claims due messages and hands them to the provider, with retries and backoff. */
export async function dispatchDueMessages(
  provider: MessagingProvider,
  limit = 25,
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, prepared: 0, failed: 0 };

  await db.transaction(async (tx) => {
    const due = await claimDueMessages(tx, limit);
    summary.claimed = due.length;

    for (const message of due) {
      try {
        const result = await provider.send({
          to: message.phone,
          body: message.body,
          templateKey: message.template_key,
          orderId: message.order_id,
        });
        if (result.status === "sent") {
          await markSent(message.id, result.providerMessageId, tx);
          summary.sent++;
        } else {
          await markPrepared(message.id, tx);
          summary.prepared++;
        }
      } catch (error) {
        const attempts = message.attempts + 1;
        const retryAt = nextAttemptAt(attempts, new Date());
        await markAttemptFailed(message.id, attempts, retryAt, String(error), tx);
        summary.failed++;
        logger.warn("message dispatch failed", {
          messageId: message.id,
          attempts,
          willRetry: Boolean(retryAt),
          error,
        });
      }
    }
  });

  return summary;
}
