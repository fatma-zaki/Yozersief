import { logActivity } from "@/modules/audit";
import { getTemplateBodies, whatsappLink } from "@/modules/messaging";
import { db } from "@/db/client";
import { withTransaction, type Tx } from "@/db/tx";
import { env } from "@/env";
import {
  ConflictError,
  isAppError,
  NotFoundError,
  ValidationError,
  type AppError,
} from "@/lib/errors";
import { formatShortDateTime } from "@/lib/format";
import { maskPhone, toInternational } from "@/lib/phone";
import { assertCan, can, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import {
  adminStatus,
  canDecide,
  customerNotes,
  decisionStep,
  desiredLabel,
  MAX_DECISION_STEPS,
  nextStage,
  personStatusLabel,
  productLabel,
  receiptLabel,
  specList,
  stageIndex,
  stageUpdateText,
  whenLabel,
  type AdminStatus,
  type Decision,
  type OrderFacts,
} from "../domain/admin-view";
import { quoteSummary } from "../domain/desk";
import {
  planTransition,
  type Actor,
  type CustomerType,
  type OrderState,
} from "../domain/lifecycle";
import {
  decideOrderSchema,
  advanceStageSchema,
  internalNoteSchema,
  type AdvanceStageInput,
  type DecideOrderInput,
  type InternalNoteInput,
} from "../schemas";
import {
  countOrdersInStatus,
  countOrdersWithEventSince,
  findCustomerContact,
  findOrgName,
  listAdminOrderRows,
  listEventsFor,
  listFilesFor,
  listPlacesFor,
  listSizesFor,
  updateInternalNote,
  type AdminOrderRow,
} from "../infrastructure/admin-repository";
import { listPendingQuotesFor, settlePendingQuote } from "../infrastructure/desk-repository";
import {
  confirmPendingDeposits,
  listOrdersWithPendingDeposit,
} from "../infrastructure/workspace-repository";
import {
  insertOrderEvent,
  loadGuardFacts,
  loadGuardFactsFor,
  lockOrder,
} from "../infrastructure/order-repository";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";
import { applyTransitionInTx, type AppliedTransition } from "./apply-transition";

/** How many recent orders the admin screen loads; filtering and search run on these. */
const LIST_LIMIT = 200;

const TEMPLATE_KEYS = ["approve", "quote", "info", "reject", "update", "ready", "thanks"];

export type AdminOrderFile = {
  id: string;
  kind: "design" | "reference" | "names_sheet" | "mockup";
  name: string;
  url: string;
  isImage: boolean;
  lowRes: boolean;
};

/** One order as the admin orders screen shows it (docs/design/Admin.html). */
export type AdminOrderView = {
  id: string;
  ref: string;
  /** Sort key (ms since epoch). */
  ts: number;
  name: string;
  /** Always masked here: revealing a phone must be logged (brief A6.3). */
  phone: string;
  product: string;
  categoryKey: string;
  productKey: string | null;
  status: AdminStatus;
  /** The lifecycle state behind `status`, for the team workspaces. */
  orderStatus: OrderState["status"];
  bizStage: OrderState["bizStage"];
  /** Pieces: the size split's sum, else the order quantity (1 when none was given). */
  quantity: number;
  /** Badge text for an individual's order. */
  statusLabel: string;
  when: string;
  receipt: string;
  date: string;
  specs: { k: string; v: string }[];
  notes: string;
  files: AdminOrderFile[];
  log: { t: string; m: string }[];
  ctype: CustomerType;
  org: string;
  role: string | null;
  stage: number;
  bulk: { sample: boolean; perPiece: boolean; batches: boolean };
  invoice: boolean;
  internalNote: string;
  /** The desk's quote draft waiting for the admin, as the quote text to send. */
  quoteDraft: string | null;
  can: { approve: boolean; info: boolean; reject: boolean; note: boolean };
  /** «سجّل المرحلة الجاية» on a business order; `blocked` explains why it can't run yet. */
  next: { label: string; blocked: string | null } | null;
};

export type AdminOrdersData = {
  orders: AdminOrderView[];
  stats: { new: number; awaiting: number; approved: number; rejected: number };
  /** Message template bodies, so previews match what the outbox will send. */
  templates: Record<string, string>;
  trackUrl: string;
};

const domainActor = (staff: StaffContext): Actor => ({
  kind: "staff",
  id: staff.id,
  can: (p) => can(staff, p),
});

const trackUrl = () => `${env.APP_URL.replace(/\/$/, "")}/track`;
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** The admin orders screen: recent orders with details, counters and message templates. */
export async function getAdminOrders(actor: StaffContext): Promise<AdminOrdersData> {
  assertCan(actor, "orders.view");
  const rows = await listAdminOrderRows(LIST_LIMIT);
  const ids = rows.map((r) => r.id);
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [sizes, places, files, events, quotes, templates, nNew, nAwaiting, nApproved, nRejected] =
    await Promise.all([
      listSizesFor(ids),
      listPlacesFor(ids),
      listFilesFor(ids),
      listEventsFor(ids),
      listPendingQuotesFor(ids),
      getTemplateBodies(TEMPLATE_KEYS),
      countOrdersInStatus("submitted"),
      countOrdersInStatus("awaiting_customer"),
      countOrdersWithEventSince(["approved", "quote_sent"], since),
      countOrdersWithEventSince(["rejected"], since),
    ]);

  const group = <T extends { orderId: string }>(list: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of list) map.set(item.orderId, [...(map.get(item.orderId) ?? []), item]);
    return map;
  };
  const sizesBy = group(sizes);
  const placesBy = group(places);
  const filesBy = group(files);
  const eventsBy = group(events);
  const quoteBy = group(quotes);
  const storage = files.length ? createFileStorage() : null;
  const [pendingDeposit, guardsBy] = await Promise.all([
    listOrdersWithPendingDeposit(rows.filter((r) => r.bizStage === "deposit").map((r) => r.id)),
    // Business orders only: they are the ones with a «سجّل المرحلة الجاية» to check.
    loadGuardFactsFor(rows.filter((r) => r.customerType !== "person").map((r) => r.id)),
  ]);
  const now = new Date();
  const actorD = domainActor(actor);

  const orders = await Promise.all(
    rows.map(async (r): Promise<AdminOrderView> => {
      const state: OrderState = {
        status: r.status,
        bizStage: r.bizStage,
        customerType: r.customerType,
      };
      const facts = orderFacts(r, sizesBy.get(r.id) ?? [], placesBy.get(r.id) ?? []);
      const bulk = { sample: r.wantsSample, perPiece: r.perPieceNames, batches: r.batchedDelivery };
      const next = nextStage(state, bulk);
      let nextView: AdminOrderView["next"] = null;
      if (next) {
        const guards = guardsBy.get(r.id) ?? (await loadGuardFacts(r.id, db));
        // The admin's «اتسجل استلام العربون» confirms the deposit the delivery person recorded.
        if (next.transition === "confirm_deposit" && pendingDeposit.has(r.id)) {
          guards.depositConfirmed = can(actor, "payments.confirm");
        }
        const planned = planTransition(state, next.transition, actorD, guards);
        nextView = { label: next.label, blocked: planned.ok ? null : planned.error.message };
      }
      return {
        id: r.id,
        ref: r.ref,
        ts: r.createdAt.getTime(),
        name: r.customerName,
        phone: maskPhone(r.customerPhone),
        product: productLabel(facts),
        categoryKey: r.categoryKey,
        productKey: r.productKey,
        status: adminStatus(r.status),
        orderStatus: r.status,
        bizStage: r.bizStage,
        quantity: pieceCount(r.quantity, sizesBy.get(r.id) ?? []),
        statusLabel: personStatusLabel(r.status),
        when: whenLabel(r.createdAt, now),
        receipt: receiptLabel(r.receiptMethod),
        date: desiredLabel(r.desiredDate),
        specs: specList(facts),
        notes: customerNotes(facts),
        files: await Promise.all(
          (filesBy.get(r.id) ?? []).map(async (f) => ({
            id: f.id,
            kind: f.kind,
            name: f.fileName,
            url: storage ? await storage.downloadUrl(f.storageKey) : "",
            isImage: f.mimeType.startsWith("image/"),
            lowRes: f.qualityFlag === "low_res",
          })),
        ),
        log: (eventsBy.get(r.id) ?? []).map((e) => ({
          t: formatShortDateTime(e.createdAt),
          m: e.note ? `${e.titleAr}: ${e.note}` : `${e.titleAr}.`,
        })),
        ctype: r.customerType,
        org: r.orgName ?? "",
        role: r.orgRole,
        stage: r.customerType === "person" ? 0 : stageIndex(r.bizStage),
        bulk,
        invoice: r.needsInvoice,
        internalNote: r.internalNote ?? "",
        quoteDraft: draftText(quoteBy.get(r.id)?.[0]),
        can: {
          approve: canDecide(state, "approve", actorD),
          info: canDecide(state, "info", actorD),
          reject: canDecide(state, "reject", actorD),
          note: can(actor, "orders.request_info"),
        },
        next: nextView,
      };
    }),
  );

  return {
    orders,
    stats: { new: nNew, awaiting: nAwaiting, approved: nApproved, rejected: nRejected },
    templates,
    trackUrl: trackUrl(),
  };
}

function pieceCount(quantity: number | null, sizes: { qty: number }[]): number {
  const split = sizes.reduce((sum, s) => sum + s.qty, 0);
  return split || quantity || 1;
}

function draftText(
  q: { unitPrice: string; total: string; leadTimeDays: number } | undefined,
): string | null {
  return q ? quoteSummary(q) : null;
}

function orderFacts(
  r: AdminOrderRow,
  sizes: { size: string; qty: number }[],
  places: { place: string }[],
): OrderFacts {
  return {
    categoryKey: r.categoryKey,
    categoryName: r.categoryName,
    productKey: r.productKey,
    productName: r.productName,
    quantity: r.quantity,
    color: r.color,
    phoneModel: r.phoneModel,
    width: r.width,
    height: r.height,
    unit: r.unit,
    shape: r.shape,
    customText: r.customText,
    description: r.description,
    notes: r.notes,
    designNotes: r.designNotes,
    needsDesignHelp: r.needsDesignHelp,
    receiptMethod: r.receiptMethod,
    deliveryAddress: r.deliveryAddress,
    desiredDate: r.desiredDate,
    sizes,
    places: places.map((p) => p.place),
  };
}

/** The sidebar badge on «الطلبات»: new orders waiting for review. */
export async function countNewOrders(actor: StaffContext): Promise<number> {
  if (!can(actor, "orders.view")) return 0;
  return countOrdersInStatus("submitted");
}

export type StaffActionResult = { ref: string; waLink: string | null };

/** Runs `fn` in a transaction; an AppError thrown inside rolls back and becomes `err`. */
export async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await withTransaction(fn));
  } catch (error) {
    if (isAppError(error)) return err(error as AppError);
    throw error;
  }
}

/**
 * After a transition queued a customer message: note it on the internal timeline and, for staff
 * who may send messages, return the wa.me link (manual provider, brief A6.6). The link carries
 * the customer's phone, so handing it out is logged as sensitive access (brief A6.3).
 */
export async function afterMessage(
  tx: Tx,
  actor: StaffContext,
  applied: Pick<AppliedTransition, "order" | "message">,
  internalNote: string | null,
): Promise<string | null> {
  if (!applied.message) return null;
  await insertOrderEvent(
    {
      orderId: applied.order.id,
      type: "message_prepared",
      titleAr: "اتجهزت رسالة واتساب للعميل",
      note: internalNote,
      visibleToCustomer: false,
      actorId: actor.id,
    },
    tx,
  );
  if (!can(actor, "messages.send")) return null;
  const contact = await findCustomerContact(applied.order.customerId, tx);
  if (!contact) return null;
  await logActivity(tx, {
    userId: actor.id,
    action: "messages.whatsapp_link",
    entityType: "message",
    entityId: applied.message.id,
    orderId: applied.order.id,
    isSensitive: true,
  });
  return whatsappLink(toInternational(contact.phone), applied.message.body);
}

/** Customer-message variables every admin template can use (brief B8). */
export async function baseVars(tx: Tx, orderId: string, customerId: string) {
  const [contact, org] = await Promise.all([
    findCustomerContact(customerId, tx),
    findOrgName(orderId, tx),
  ]);
  return { name: firstName(contact?.name ?? ""), org: org ?? "", link: trackUrl() };
}

const TEXT_REQUIRED: Record<Decision, string | null> = {
  approve: null,
  info: "اكتب المطلوب من العميل بوضوح (5 حروف على الأقل).",
  reject: "اكتب سبب واضح (5 حروف على الأقل).",
};

/**
 * «موافقة» / «طلب بيانات» / «رفض» (brief B7). Moves a new or paused order into review first,
 * then decides — all in one transaction, so a failing step leaves the order untouched.
 */
export async function decideOrder(
  actor: StaffContext,
  raw: DecideOrderInput,
): Promise<Result<StaffActionResult>> {
  assertCan(actor, "orders.view");
  const input = decideOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    const business = order.customerType !== "person";
    const needsText =
      TEXT_REQUIRED[input.decision] ?? (business ? "اكتب عرض السعر (5 حروف على الأقل)." : null);
    if (needsText && input.text.length < 5)
      throw new ValidationError({ text: [needsText] }, needsText);

    const vars = await baseVars(tx, order.id, order.customerId);
    let state: OrderState = {
      status: order.status,
      bizStage: order.bizStage,
      customerType: order.customerType,
    };
    const notify = input.decision === "approve" ? input.notify : true;
    for (let i = 0; i < MAX_DECISION_STEPS; i++) {
      const { step, final } = decisionStep(state, input.decision);
      const applied = await applyTransitionInTx(
        tx,
        { kind: "staff", staff: actor },
        {
          orderId: order.id,
          transition: step,
          ...(final && input.decision !== "approve" ? { reason: input.text } : {}),
          ...(final && input.decision === "approve" && business ? { quoteText: input.text } : {}),
          notifyCustomer: final && notify,
          messageVars: {
            ...vars,
            ...(input.decision === "approve" && !business ? { price_date: input.text } : {}),
          },
        },
      );
      if (!applied.ok) throw applied.error;
      if (final) {
        if (business && input.decision !== "info") {
          await settlePendingQuote(
            order.id,
            input.decision === "approve"
              ? { status: "sent", approvedBy: actor.id }
              : { status: "declined" },
            tx,
          );
        }
        const note = input.decision === "approve" && input.text ? input.text : null;
        const waLink = await afterMessage(tx, actor, applied.value, note);
        return { ref: order.ref, waLink };
      }
      state = { ...state, ...applied.value.plan.to };
    }
    throw new ConflictError("decision did not finish", "مينفعش تعمل الإجراء ده دلوقتي.");
  });
}

/** «سجّل المرحلة الجاية» on a business order, with the customer update (brief B7). */
export async function advanceOrderStage(
  actor: StaffContext,
  raw: AdvanceStageInput,
): Promise<Result<StaffActionResult & { label: string }>> {
  assertCan(actor, "orders.view");
  const input = advanceStageSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    const state: OrderState = {
      status: order.status,
      bizStage: order.bizStage,
      customerType: order.customerType,
    };
    const next = nextStage(state, { sample: order.wantsSample, batches: order.batchedDelivery });
    if (!next) throw new ConflictError("no next stage", "مفيش مرحلة جاية للطلب ده.");
    if (next.transition === "confirm_deposit") {
      assertCan(actor, "payments.confirm");
      const confirmed = await confirmPendingDeposits(order.id, actor.id, tx);
      for (const p of confirmed) {
        await logActivity(tx, {
          userId: actor.id,
          action: "payments.confirmed",
          entityType: "payment",
          entityId: p.id,
          orderId: order.id,
        });
      }
    }
    const vars = await baseVars(tx, order.id, order.customerId);
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      {
        orderId: order.id,
        transition: next.transition,
        notifyCustomer: input.notify,
        messageVars: {
          ...vars,
          update: stageUpdateText(next.transition, {
            sample: order.wantsSample,
            receiptMethod: order.receiptMethod,
          }),
        },
      },
    );
    if (!applied.ok) throw applied.error;
    const waLink = await afterMessage(tx, actor, applied.value, null);
    return { ref: order.ref, waLink, label: next.label };
  });
}

/** «ملاحظة داخلية»: staff-only note on the order (never on tracking). */
export async function saveInternalNote(
  actor: StaffContext,
  raw: InternalNoteInput,
): Promise<Result<{ saved: true }>> {
  assertCan(actor, "orders.request_info");
  const input = internalNoteSchema.parse(raw);
  return inTransaction(async (tx) => {
    const found = await updateInternalNote(input.orderId, input.note || null, tx);
    if (!found) throw new NotFoundError(`order ${input.orderId}`);
    await logActivity(tx, {
      userId: actor.id,
      action: "orders.internal_note_updated",
      entityType: "order",
      entityId: input.orderId,
      orderId: input.orderId,
      meta: { length: input.note.length },
    });
    return { saved: true as const };
  });
}
