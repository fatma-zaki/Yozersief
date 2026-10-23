import { logActivity } from "@/modules/audit";
import { enqueueMessage, type TemplateVars } from "@/modules/messaging";
import { withTransaction, type Tx } from "@/db/tx";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { can, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import {
  planTransition,
  type Actor,
  type OrderState,
  type TransitionContext,
  type TransitionName,
  type TransitionPlan,
} from "../domain/lifecycle";
import {
  findPausedFrom,
  insertOrderEvent,
  loadGuardFacts,
  lockOrder,
  updateOrderState,
} from "../infrastructure/order-repository";

export type TransitionInput = {
  orderId: string;
  transition: TransitionName;
  reason?: string;
  quoteText?: string;
  /** Prepare the optional WhatsApp update (B3: "triggers an optional WhatsApp update"). */
  notifyCustomer?: boolean;
  /** Staff-edited message text from the preview. */
  messageBody?: string;
  messageVars?: TemplateVars;
};

export type TransitionActor = { kind: "staff"; staff: StaffContext } | { kind: "customer" };

/** What one applied transition wrote: the plan, the order it ran on, and any queued message. */
export type AppliedTransition = {
  plan: TransitionPlan;
  order: { id: string; ref: string; customerId: string };
  message: { id: string; body: string } | null;
};

/**
 * Applies one lifecycle transition in a single transaction (brief A3, A6.4):
 * lock order → plan (state, permission, guards) → update order → order_events →
 * activity_logs → outbox message. Any failure rolls everything back.
 */
export async function applyTransition(
  actor: TransitionActor,
  input: TransitionInput,
): Promise<Result<TransitionPlan>> {
  return withTransaction(async (tx) => {
    const applied = await applyTransitionInTx(tx, actor, input);
    return applied.ok ? ok(applied.value.plan) : applied;
  });
}

/**
 * The body of `applyTransition`, inside the caller's transaction, so a use case can chain
 * transitions atomically (e.g. start_review → approve). A returned error has written nothing;
 * a caller that already wrote earlier steps must throw it to roll those back.
 */
export async function applyTransitionInTx(
  tx: Tx,
  actor: TransitionActor,
  input: TransitionInput,
): Promise<Result<AppliedTransition>> {
  const order = await lockOrder(input.orderId, tx);
  if (!order) return err(new NotFoundError(`order ${input.orderId}`));

  const state: OrderState = {
    status: order.status,
    bizStage: order.bizStage,
    customerType: order.customerType,
  };
  const facts = await loadGuardFacts(order.id, tx);
  const ctx: TransitionContext = {
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.quoteText !== undefined ? { quoteText: input.quoteText } : {}),
    mockupApproved: facts.mockupApproved,
    mockupSent: facts.mockupSent,
    depositConfirmed: facts.depositConfirmed,
    qcPassed: facts.qcPassed,
  };
  if (input.transition === "customer_responded") {
    const pausedFrom = await findPausedFrom(order.id, tx);
    if (pausedFrom) ctx.pausedFrom = pausedFrom;
  }

  const domainActor: Actor =
    actor.kind === "customer"
      ? { kind: "customer" }
      : { kind: "staff", id: actor.staff.id, can: (p) => can(actor.staff, p) };

  const planned = planTransition(state, input.transition, domainActor, ctx);
  if (!planned.ok) {
    const e = planned.error;
    if (e.code === "forbidden") return err(new ForbiddenError(e.permission, e.message));
    if (e.code === "guard_failed") return err(new ValidationError({}, e.message));
    return err(new ConflictError(`${e.code}: ${input.transition} from ${state.status}`, e.message));
  }
  const plan = planned.value;
  const actorId = actor.kind === "staff" ? actor.staff.id : null;

  await updateOrderState(
    order.id,
    plan.to,
    plan.transition === "reject" ? { rejectionReason: plan.event.note } : {},
    tx,
  );
  await insertOrderEvent(
    {
      orderId: order.id,
      type: plan.event.type,
      titleAr: plan.event.titleAr,
      note: plan.event.note,
      visibleToCustomer: plan.event.visibleToCustomer,
      actorId,
    },
    tx,
  );
  await logActivity(tx, {
    userId: actorId,
    action: plan.activity,
    entityType: "order",
    entityId: order.id,
    orderId: order.id,
    meta: {
      fromStatus: state.status,
      fromBizStage: state.bizStage,
      toStatus: plan.to.status,
      toBizStage: plan.to.bizStage,
      byCustomer: actor.kind === "customer",
    },
  });

  let message: AppliedTransition["message"] = null;
  if (plan.message && input.notifyCustomer) {
    message = await enqueueMessage(tx, {
      orderId: order.id,
      customerId: order.customerId,
      templateKey: plan.message,
      vars: {
        ref: order.ref,
        ...(plan.event.note ? { reason: plan.event.note, update: plan.event.note } : {}),
        ...(input.quoteText ? { quote: input.quoteText } : {}),
        ...input.messageVars,
      },
      actorId,
      ...(input.messageBody ? { bodyOverride: input.messageBody } : {}),
    });
  }

  return ok({
    plan,
    order: { id: order.id, ref: order.ref, customerId: order.customerId },
    message,
  });
}
