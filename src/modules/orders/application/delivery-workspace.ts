import { logActivity } from "@/modules/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { cairoDateString, formatMoney } from "@/lib/format";
import { compareMoney, subtractMoney, addMoney } from "@/lib/money";
import { lastDigits } from "@/lib/phone";
import { assertCan, type StaffContext } from "@/lib/rbac";
import type { Result } from "@/lib/result";
import {
  acceptsPayment,
  MAX_CODE_ATTEMPTS,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  paymentKindFor,
  type PaymentKind,
  type PaymentMethod,
} from "../domain/workspaces";
import {
  handoverSchema,
  recordPaymentSchema,
  type HandoverInput,
  type RecordPaymentInput,
} from "../schemas";
import { findCustomerContact, listSizesFor } from "../infrastructure/admin-repository";
import { insertOrderEvent, lockOrder } from "../infrastructure/order-repository";
import {
  addFailedCodeAttempt,
  findOpenHandover,
  insertPayment,
  listDeliveredSince,
  listInvoicedOrderIds,
  listJobsFor,
  listOpenHandoversFor,
  listPaymentsFor,
  listRecentPayments,
  listSentQuoteTotals,
} from "../infrastructure/workspace-repository";
import { afterMessage, baseVars, getAdminOrders, inTransaction } from "./admin-orders";
import { applyTransitionInTx } from "./apply-transition";

export type HandoverView = {
  id: string;
  ref: string;
  name: string;
  product: string;
  categoryKey: string;
  productKey: string | null;
  /** «استلام من المحل» or «توصيل · العنوان». */
  method: string;
  /** Masked; the handover asks for its last 3 digits. */
  phone: string;
  state: "ready" | "qc" | "done";
  /** What the customer still owes on the sent quote, formatted; null when nothing / unknown. */
  due: string | null;
  /** Too many wrong codes: the admin has to step in. */
  locked: boolean;
};

export type DeliveryData = {
  handovers: HandoverView[];
  payOrders: { id: string; label: string }[];
  payments: { id: string; ref: string; what: string; pending: boolean }[];
  invoices: { id: string; title: string }[];
};

/** Midnight in Cairo today (Egypt switches between UTC+2 and UTC+3). */
function cairoMidnight(now: Date): Date {
  const day = cairoDateString(now);
  for (const offset of ["+03:00", "+02:00"]) {
    const t = new Date(`${day}T00:00:00${offset}`);
    if (cairoDateString(t) === day) return t;
  }
  return new Date(now.getTime() - 24 * 3_600_000);
}

/**
 * Delivery & collection (docs/design/Team-Delivery.html): today's handovers, payments waiting
 * for the admin, and the invoices customers asked for.
 */
export async function getDeliveryBoard(actor: StaffContext): Promise<DeliveryData> {
  assertCan(actor, "delivery.handover");
  const data = await getAdminOrders(actor);
  const active = data.orders.filter((o) =>
    ["approved", "in_production", "ready", "delivered"].includes(o.orderStatus),
  );
  const ids = active.map((o) => o.id);
  const [jobs, open, paid, quotes, invoiced, deliveredToday, recent] = await Promise.all([
    listJobsFor(ids),
    listOpenHandoversFor(ids),
    listPaymentsFor(ids),
    listSentQuoteTotals(ids),
    listInvoicedOrderIds(ids),
    listDeliveredSince(cairoMidnight(new Date())),
    listRecentPayments(8),
  ]);
  const jobBy = new Map(jobs.map((j) => [j.orderId, j]));
  const attemptsBy = new Map(open.map((h) => [h.orderId, h.failedCodeAttempts]));
  const quoteBy = new Map<string, string>();
  for (const q of quotes) if (!quoteBy.has(q.orderId)) quoteBy.set(q.orderId, q.total);

  const dueFor = (orderId: string): string | null => {
    const total = quoteBy.get(orderId);
    if (!total) return null;
    const sum = addMoney(
      "0.00",
      ...paid.filter((p) => p.orderId === orderId && p.status !== "rejected").map((p) => p.amount),
    );
    const left = subtractMoney(total, sum);
    return compareMoney(left, "0.00") > 0 ? formatMoney(left) : null;
  };

  const handovers = active.flatMap((o): HandoverView[] => {
    const inQc = o.orderStatus === "in_production" && jobBy.get(o.id)?.stage === "qc";
    const state =
      o.orderStatus === "ready"
        ? "ready"
        : inQc || (o.orderStatus === "in_production" && o.bizStage === "qc")
          ? "qc"
          : o.orderStatus === "delivered" && deliveredToday.has(o.id)
            ? "done"
            : null;
    if (!state) return [];
    const address = o.specs.find((s) => s.k === "عنوان التوصيل")?.v;
    return [
      {
        id: o.id,
        ref: o.ref,
        name: o.name,
        product: o.product,
        categoryKey: o.categoryKey,
        productKey: o.productKey,
        method: address ? `${o.receipt} · ${address}` : o.receipt,
        phone: o.phone,
        state,
        due: state === "done" ? null : dueFor(o.id),
        locked: (attemptsBy.get(o.id) ?? 0) >= MAX_CODE_ATTEMPTS,
      },
    ];
  });
  const order = { ready: 0, qc: 1, done: 2 } as const;
  handovers.sort((a, b) => order[a.state] - order[b.state]);

  const payOrders = active
    .filter((o) =>
      acceptsPayment({ status: o.orderStatus, bizStage: o.bizStage, customerType: o.ctype }),
    )
    .map((o) => {
      const kind = paymentKindFor(
        { status: o.orderStatus, bizStage: o.bizStage, customerType: o.ctype },
        paid.some((p) => p.orderId === o.id && p.status !== "rejected"),
      );
      return { id: o.id, label: `${o.ref} — ${o.org || o.name} (${PAYMENT_KIND_LABEL[kind]})` };
    });

  return {
    handovers,
    payOrders,
    payments: recent.map((p) => ({
      id: p.id,
      ref: p.ref,
      what: `${PAYMENT_KIND_LABEL[p.kind as PaymentKind]} · ${formatMoney(p.amount)} · ${
        PAYMENT_METHOD_LABEL[p.method as PaymentMethod] ?? p.method
      }`,
      pending: p.status === "pending_admin",
    })),
    invoices: active
      .filter((o) => o.invoice && o.orderStatus !== "approved" && !invoiced.has(o.id))
      .map((o) => ({
        id: o.id,
        title: `${o.org || o.name} — ${o.orderStatus === "delivered" ? "اتسلم" : "بعد التسليم"}`,
      })),
  };
}

export type HandoverResult =
  { done: true; ref: string; waLink: string | null } | { done: false; attemptsLeft: number };

/**
 * «تأكيد التسليم» (B3 step 9): the customer's last 3 phone digits must match. A wrong code is
 * counted (and logged for the admin's alerts) and the handover locks after MAX_CODE_ATTEMPTS.
 */
export async function confirmHandover(
  actor: StaffContext,
  raw: HandoverInput,
): Promise<Result<HandoverResult>> {
  assertCan(actor, "delivery.handover");
  const input = handoverSchema.parse(raw);
  return inTransaction(async (tx): Promise<HandoverResult> => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    if (order.status !== "ready") {
      throw new ConflictError("not ready", "الطلب ده مش جاهز للتسليم.");
    }
    const open = await findOpenHandover(order.id, tx);
    if ((open?.failedCodeAttempts ?? 0) >= MAX_CODE_ATTEMPTS) {
      throw new ConflictError(
        "handover locked",
        "التسليم اتقفل بعد محاولات غلط كتير. كلّم المدير يراجع الطلب.",
      );
    }
    const contact = await findCustomerContact(order.customerId, tx);
    if (!contact) throw new NotFoundError(`customer of ${order.ref}`);

    if (lastDigits(contact.phone) !== input.code) {
      const sizes = await listSizesFor([order.id], tx);
      const qty = sizes.reduce((s, x) => s + x.qty, 0) || order.quantity || 1;
      const attempts = await addFailedCodeAttempt(order.id, qty, tx);
      await logActivity(tx, {
        userId: actor.id,
        action: "delivery.wrong_code",
        entityType: "order",
        entityId: order.id,
        orderId: order.id,
        isSensitive: true,
        meta: { attempts },
      });
      return { done: false, attemptsLeft: Math.max(0, MAX_CODE_ATTEMPTS - attempts) };
    }

    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      {
        orderId: order.id,
        transition: "deliver",
        notifyCustomer: true,
        messageVars: await baseVars(tx, order.id, order.customerId),
      },
    );
    if (!applied.ok) throw applied.error;
    const waLink = await afterMessage(tx, actor, applied.value, null);
    return { done: true, ref: order.ref, waLink };
  });
}

/** «سجّل الدفعة»: stays «مستنية تأكيد المدير» until the admin confirms it (B3 step 6). */
export async function recordPayment(
  actor: StaffContext,
  raw: RecordPaymentInput,
): Promise<Result<{ ref: string; kind: PaymentKind }>> {
  assertCan(actor, "payments.record");
  const input = recordPaymentSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    if (!acceptsPayment(order)) {
      throw new ConflictError("no payment", "مينفعش تسجّل دفعة على الطلب ده في حالته دي.");
    }
    const previous = await listPaymentsFor([order.id], tx);
    const kind = paymentKindFor(
      order,
      previous.some((p) => p.status !== "rejected"),
    );
    const payment = await insertPayment(
      {
        orderId: order.id,
        kind,
        amount: input.amount,
        method: input.method,
        recordedBy: actor.id,
      },
      tx,
    );
    await insertOrderEvent(
      {
        orderId: order.id,
        type: "payment_recorded",
        titleAr: `اتسجلت دفعة (${PAYMENT_KIND_LABEL[kind]}) — مستنية تأكيد المدير`,
        note: `${formatMoney(input.amount)} · ${PAYMENT_METHOD_LABEL[input.method]}`,
        visibleToCustomer: false,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "payments.recorded",
      entityType: "payment",
      entityId: payment.id,
      orderId: order.id,
      meta: { kind, method: input.method },
    });
    return { ref: order.ref, kind };
  });
}
