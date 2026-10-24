import { logActivity } from "@/modules/audit";
import { enqueueMessage, whatsappLink } from "@/modules/messaging";
import { withTransaction, type Tx } from "@/db/tx";
import {
  ConflictError,
  isAppError,
  NotFoundError,
  ValidationError,
  type AppError,
} from "@/lib/errors";
import { toInternational } from "@/lib/phone";
import { assertCan, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import { stageUpdateText } from "../domain/admin-view";
import { isDesignJob } from "../domain/workspaces";
import {
  averageFirstResponseMinutes,
  deskMockupState,
  deskState,
  DESK_EVENTS,
  durationLabel,
  quoteSummary,
  type DeskState,
} from "../domain/desk";
import {
  deskOrderSchema,
  deskQuoteSchema,
  mockupDecisionSchema,
  type DeskOrderInput,
  type DeskQuoteInput,
  type MockupDecisionInput,
} from "../schemas";
import { findCustomerContact } from "../infrastructure/admin-repository";
import {
  hasPendingQuote,
  insertQuote,
  listEventTypesFor,
  listFirstResponses,
} from "../infrastructure/desk-repository";
import { insertOrderEvent, lockOrder } from "../infrastructure/order-repository";
import { createFileStorage } from "../infrastructure/vercel-blob-storage";
import {
  findLatestMockupFile,
  listMockupsFor,
  markMockupSent,
} from "../infrastructure/workspace-repository";
import {
  afterMessage,
  baseVars,
  getAdminOrders,
  type AdminOrdersData,
  type AdminOrderView,
} from "./admin-orders";
import { applyTransitionInTx } from "./apply-transition";

export type DeskOrderView = AdminOrderView & {
  desk: DeskState;
  /** The latest mockup version, while it waits on the desk or the customer. */
  mockup: { version: number; url: string; isImage: boolean; fileName: string } | null;
};

export type DeskData = Omit<AdminOrdersData, "orders" | "stats"> & {
  orders: DeskOrderView[];
  stats: { new: number; awaiting: number; pending: number; firstResponse: string | null };
};

/** «متوسط أول رد» looks back this far. */
const FIRST_RESPONSE_DAYS = 30;

/**
 * The desk queue (docs/design/Team-Desk.html): undecided orders with where each one stands,
 * plus the counters. Decided orders belong to the admin and the other workspaces.
 */
export async function getDeskQueue(actor: StaffContext): Promise<DeskData> {
  assertCan(actor, "quotes.draft");
  const data = await getAdminOrders(actor);
  const since = new Date(Date.now() - FIRST_RESPONSE_DAYS * 86_400_000);
  const [events, firstResponses] = await Promise.all([
    listEventTypesFor(data.orders.map((o) => o.id)),
    listFirstResponses(since),
  ]);
  const typesBy = new Map<string, string[]>();
  for (const e of events) typesBy.set(e.orderId, [...(typesBy.get(e.orderId) ?? []), e.type]);

  const designIds = data.orders
    .filter((o) =>
      isDesignJob({ status: o.orderStatus, bizStage: o.bizStage, customerType: o.ctype }),
    )
    .map((o) => o.id);
  const mockups = await listMockupsFor(designIds);
  const latestBy = new Map(mockups.map((m) => [m.orderId, m]));
  const storage = mockups.length ? createFileStorage() : null;

  const orders = (
    await Promise.all(
      data.orders.map(async (o): Promise<DeskOrderView | null> => {
        const latest = latestBy.get(o.id);
        const mockupState = latest ? deskMockupState(latest.status) : null;
        if (latest && mockupState) {
          return {
            ...o,
            desk: mockupState,
            mockup: {
              version: latest.version,
              url: storage ? await storage.downloadUrl(latest.storageKey) : "",
              isImage: /\.(png|jpe?g|svg)$/i.test(latest.fileName),
              fileName: latest.fileName,
            },
          };
        }
        const desk = deskState(o.status, typesBy.get(o.id) ?? []);
        return desk ? { ...o, desk, mockup: null } : null;
      }),
    )
  ).filter((o): o is DeskOrderView => o !== null);
  const count = (s: DeskState) => orders.filter((o) => o.desk === s).length;
  const minutes = averageFirstResponseMinutes(firstResponses);
  return {
    orders,
    stats: {
      new: count("new"),
      awaiting: count("awaiting"),
      pending: count("pending"),
      firstResponse: minutes === null ? null : durationLabel(minutes),
    },
    templates: data.templates,
    trackUrl: data.trackUrl,
  };
}

export type DeskActionResult = { ref: string };

async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await withTransaction(fn));
  } catch (error) {
    if (isAppError(error)) return err(error as AppError);
    throw error;
  }
}

/** Locks an undecided order and moves a new one into review, as the admin's decisions do. */
async function takeForReview(tx: Tx, actor: StaffContext, orderId: string) {
  const order = await lockOrder(orderId, tx);
  if (!order) throw new NotFoundError(`order ${orderId}`);
  if (!["submitted", "in_review", "awaiting_customer"].includes(order.status)) {
    throw new ConflictError("order decided", "اتُّخذ قرار بشأن هذا الطلب بالفعل.");
  }
  if (order.status === "submitted") {
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      { orderId, transition: "start_review" },
    );
    if (!applied.ok) throw applied.error;
  }
  return order;
}

/**
 * «أرسل إلى المدير للاعتماد»: the desk's quote for an organisation order (brief B3 step 3). The
 * admin approves it and sends it from the orders screen; until then nothing reaches the customer.
 */
export async function draftQuote(
  actor: StaffContext,
  raw: DeskQuoteInput,
): Promise<Result<DeskActionResult>> {
  assertCan(actor, "quotes.draft");
  const input = deskQuoteSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await takeForReview(tx, actor, input.orderId);
    if (order.customerType === "person") {
      throw new ConflictError("person order", "عرض السعر الرسمي مخصص لطلبات الشركات والجهات فقط.");
    }
    if (await hasPendingQuote(order.id, tx)) {
      throw new ConflictError("quote pending", "توجد بالفعل مسودة عرض سعر بانتظار المدير.");
    }
    const quote = await insertQuote(
      {
        orderId: order.id,
        unitPrice: input.unitPrice,
        total: input.total,
        leadTimeDays: input.leadTimeDays,
        preparedBy: actor.id,
      },
      tx,
    );
    await insertOrderEvent(
      {
        orderId: order.id,
        type: DESK_EVENTS.quoteDrafted,
        titleAr: "جُهّزت مسودة عرض السعر للمدير",
        note: quoteSummary(input),
        visibleToCustomer: false,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "quotes.drafted",
      entityType: "quote",
      entityId: quote.id,
      orderId: order.id,
      meta: { version: quote.version },
    });
    return { ref: order.ref };
  });
}

/** «حوّل إلى المدير للموافقة» on an individual's order: the admin takes the final decision. */
export async function forwardToAdmin(
  actor: StaffContext,
  raw: DeskOrderInput,
): Promise<Result<DeskActionResult>> {
  assertCan(actor, "orders.request_info");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await takeForReview(tx, actor, input.orderId);
    await insertOrderEvent(
      {
        orderId: order.id,
        type: DESK_EVENTS.forwarded,
        titleAr: "حُوّل إلى المدير للموافقة",
        note: null,
        visibleToCustomer: false,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "orders.forwarded",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
    });
    return { ref: order.ref };
  });
}

/**
 * «واتساب العميل»: a wa.me link to the customer. It carries the phone number, so handing it out
 * is logged as sensitive access (brief A6.3).
 */
export async function customerWhatsappLink(
  actor: StaffContext,
  raw: DeskOrderInput,
): Promise<Result<{ waLink: string }>> {
  assertCan(actor, "customers.view_phone");
  assertCan(actor, "messages.send");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    const contact = await findCustomerContact(order.customerId, tx);
    if (!contact) throw new NotFoundError(`customer of ${order.ref}`);
    await logActivity(tx, {
      userId: actor.id,
      action: "customers.phone_revealed",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      isSensitive: true,
    });
    const first = contact.name.trim().split(/\s+/)[0] ?? "";
    const greeting = `مرحبًا ${first}، معك يوزرسيف بخصوص طلبك رقم ${order.ref}.`;
    return { waLink: whatsappLink(toInternational(contact.phone), greeting) };
  });
}

/**
 * «أرسل الموكاب إلى العميل» (B3 step 5): the designer's latest version goes to the customer, with a
 * WhatsApp update; tracking shows the step. The customer answers on WhatsApp and the desk records it.
 */
export async function sendMockupToCustomer(
  actor: StaffContext,
  raw: DeskOrderInput,
): Promise<Result<{ ref: string; waLink: string | null }>> {
  assertCan(actor, "messages.send");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    const latest = await findLatestMockupFile(order.id, tx);
    if (!isDesignJob(order) || latest?.status !== "with_desk") {
      throw new ConflictError("no mockup", "لا يوجد موكاب جديد بانتظار الإرسال لهذا الطلب.");
    }
    await markMockupSent(latest.id, tx);
    await insertOrderEvent(
      {
        orderId: order.id,
        type: "mockup_sent",
        titleAr: "أُرسل إليك الموكاب للاعتماد",
        note: null,
        visibleToCustomer: true,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "mockups.sent",
      entityType: "mockup",
      entityId: latest.id,
      orderId: order.id,
    });
    const message = await enqueueMessage(tx, {
      orderId: order.id,
      customerId: order.customerId,
      templateKey: "update",
      vars: {
        ...(await baseVars(tx, order.id, order.customerId)),
        ref: order.ref,
        update: `الموكاب جاهز${order.wantsSample ? " ومعه العينة" : ""}. راجعه وأرسل إلينا «موافق» أو أرسل التعديلات المطلوبة.`,
      },
      actorId: actor.id,
    });
    const waLink = await afterMessage(
      tx,
      actor,
      { order: { id: order.id, ref: order.ref, customerId: order.customerId }, message },
      null,
    );
    return { ref: order.ref, waLink };
  });
}

/** The customer's answer on the mockup, recorded by the desk from WhatsApp (B3 step 5). */
export async function recordMockupDecision(
  actor: StaffContext,
  raw: MockupDecisionInput,
): Promise<Result<{ ref: string; waLink: string | null }>> {
  assertCan(actor, "messages.send");
  const input = mockupDecisionSchema.parse(raw);
  if (input.decision === "changes" && input.feedback.length < 5) {
    const m = "اكتب التعديلات التي طلبها العميل (5 أحرف على الأقل).";
    throw new ValidationError({ feedback: [m] }, m);
  }
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    const approve = input.decision === "approve";
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      {
        orderId: order.id,
        transition: approve ? "approve_mockup" : "request_mockup_changes",
        ...(approve ? {} : { reason: input.feedback }),
        notifyCustomer: approve,
        messageVars: {
          ...(await baseVars(tx, order.id, order.customerId)),
          update: stageUpdateText("approve_mockup", {
            sample: order.wantsSample,
            receiptMethod: order.receiptMethod,
          }),
        },
      },
    );
    if (!applied.ok) throw applied.error;
    const waLink = await afterMessage(tx, actor, applied.value, null);
    return { ref: order.ref, waLink };
  });
}
