/**
 * Order lifecycle state machine (brief A6.4, B3). Pure: no IO, no framework.
 *
 * Individual path:  submitted → in_review ⇄ awaiting_customer → approved | rejected
 *                   → in_production → ready → delivered
 * Business path:    status moves as above; biz_stage tracks the 7 business stages:
 *                   quote → customer_approval → mockup → deposit → production → qc → delivery → done
 *
 * `planTransition` validates and returns what to write; the application layer applies it in
 * one transaction (order update + order_events + activity_logs + outbox message).
 */
import type { Permission } from "@/lib/rbac/permissions";
import { err, ok, type Result } from "@/lib/result";

export const ORDER_STATUSES = [
  "submitted",
  "in_review",
  "awaiting_customer",
  "approved",
  "rejected",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BIZ_STAGES = [
  "quote",
  "customer_approval",
  "mockup",
  "deposit",
  "production",
  "qc",
  "delivery",
  "done",
] as const;
export type BizStage = (typeof BIZ_STAGES)[number];

export type CustomerType = "person" | "biz" | "group";
export type OrderPath = "person" | "business";

export type OrderState = {
  status: OrderStatus;
  bizStage: BizStage | null;
  customerType: CustomerType;
};

export type TemplateKey = "approve" | "quote" | "update" | "info" | "reject" | "ready" | "thanks";

export type Actor =
  | { kind: "staff"; id: string; can: (permission: Permission) => boolean }
  | { kind: "customer" }
  | { kind: "system" };

export type TransitionContext = {
  /** Required for reject (sent to the customer) and request_info. */
  reason?: string;
  /** Required for approve_and_send_quote. */
  quoteText?: string;
  /** Status the order was in when it was paused for the customer. */
  pausedFrom?: OrderStatus;
  /** Facts the application layer looks up for guards. */
  mockupApproved?: boolean;
  /** A mockup version has been sent to the customer and awaits their decision. */
  mockupSent?: boolean;
  depositConfirmed?: boolean;
  qcPassed?: boolean;
};

export const TRANSITIONS = [
  "start_review",
  "request_info",
  "customer_responded",
  "approve",
  "approve_and_send_quote",
  "reject",
  "accept_quote",
  "approve_mockup",
  "request_mockup_changes",
  "confirm_deposit",
  "start_production",
  "send_to_qc",
  "mark_ready",
  "deliver",
  "cancel",
] as const;
export type TransitionName = (typeof TRANSITIONS)[number];

export type TransitionErrorCode =
  "wrong_path" | "invalid_from_state" | "forbidden" | "guard_failed";

export type TransitionError = {
  code: TransitionErrorCode;
  transition: TransitionName;
  /** Egyptian Arabic, safe to show staff. */
  message: string;
  permission?: Permission;
};

export type TransitionPlan = {
  transition: TransitionName;
  from: OrderState;
  to: { status: OrderStatus; bizStage: BizStage | null };
  event: { type: string; titleAr: string; note: string | null; visibleToCustomer: boolean };
  /** Optional customer WhatsApp update (staff may skip sending). */
  message: TemplateKey | null;
  /** activity_logs.action */
  activity: string;
};

type Definition = {
  paths: readonly OrderPath[];
  from: (s: OrderState) => boolean;
  to: (s: OrderState, ctx: TransitionContext) => { status: OrderStatus; bizStage: BizStage | null };
  /** null = no staff permission needed (customer or system). */
  permission: Permission | null;
  /** The customer may trigger it from the tracking page. */
  customerAllowed?: boolean;
  guard?: (s: OrderState, ctx: TransitionContext) => string | null;
  event: { type: string; titleAr: string };
  message: TemplateKey | null;
  note?: (ctx: TransitionContext) => string | null;
};

/** Statuses from which the order can be paused for the customer or rejected (before production). */
const PRE_PRODUCTION: readonly OrderStatus[] = ["submitted", "in_review", "approved"];

const isStatus =
  (...statuses: OrderStatus[]) =>
  (s: OrderState) =>
    statuses.includes(s.status);

const isBizStage = (status: OrderStatus, stage: BizStage) => (s: OrderState) =>
  s.status === status && s.bizStage === stage;

const keep = (s: OrderState) => s.bizStage;

const DEFINITIONS: Record<TransitionName, Definition> = {
  start_review: {
    paths: ["person", "business"],
    from: isStatus("submitted"),
    to: (s) => ({ status: "in_review", bizStage: pathOf(s) === "business" ? "quote" : null }),
    permission: "orders.request_info",
    event: { type: "review_started", titleAr: "بدأت المراجعة" },
    message: null,
  },
  request_info: {
    paths: ["person", "business"],
    from: (s) => PRE_PRODUCTION.includes(s.status),
    to: (s) => ({ status: "awaiting_customer", bizStage: keep(s) }),
    permission: "orders.request_info",
    guard: (_s, ctx) => (ctx.reason?.trim() ? null : "اكتب البيانات المطلوبة من العميل."),
    event: { type: "info_requested", titleAr: "محتاجين بيانات منك" },
    message: "info",
    note: (ctx) => ctx.reason?.trim() ?? null,
  },
  customer_responded: {
    paths: ["person", "business"],
    from: isStatus("awaiting_customer"),
    to: (s, ctx) => ({ status: ctx.pausedFrom ?? "in_review", bizStage: keep(s) }),
    permission: "messages.send",
    customerAllowed: true,
    guard: (_s, ctx) =>
      ctx.pausedFrom && !PRE_PRODUCTION.includes(ctx.pausedFrom)
        ? "الحالة اللي الطلب اتوقف منها مش صحيحة."
        : null,
    event: { type: "customer_responded", titleAr: "وصلنا ردك وبنكمّل" },
    message: null,
  },
  approve: {
    paths: ["person"],
    from: isStatus("in_review"),
    to: () => ({ status: "approved", bizStage: null }),
    permission: "orders.approve",
    event: { type: "approved", titleAr: "تمت الموافقة" },
    message: "approve",
  },
  approve_and_send_quote: {
    paths: ["business"],
    from: isBizStage("in_review", "quote"),
    to: () => ({ status: "approved", bizStage: "customer_approval" }),
    permission: "orders.approve",
    guard: (_s, ctx) => (ctx.quoteText?.trim() ? null : "اكتب نص عرض السعر قبل الإرسال."),
    event: { type: "quote_sent", titleAr: "اتبعتلك عرض السعر" },
    message: "quote",
  },
  reject: {
    paths: ["person", "business"],
    from: (s) => [...PRE_PRODUCTION, "awaiting_customer"].includes(s.status),
    to: (s) => ({ status: "rejected", bizStage: keep(s) }),
    permission: "orders.approve",
    guard: (_s, ctx) => (ctx.reason?.trim() ? null : "سبب الرفض مطلوب وهيتبعت للعميل."),
    event: { type: "rejected", titleAr: "مرفوض" },
    message: "reject",
    note: (ctx) => ctx.reason?.trim() ?? null,
  },
  accept_quote: {
    paths: ["business"],
    from: isBizStage("approved", "customer_approval"),
    to: () => ({ status: "approved", bizStage: "mockup" }),
    permission: "messages.send",
    customerAllowed: true,
    event: { type: "quote_accepted", titleAr: "وافقت على عرض السعر" },
    message: "update",
  },
  approve_mockup: {
    paths: ["business"],
    from: isBizStage("approved", "mockup"),
    to: () => ({ status: "approved", bizStage: "deposit" }),
    permission: "messages.send",
    customerAllowed: true,
    guard: (_s, ctx) => (ctx.mockupSent ? null : "مفيش موكاب متبعت للعميل لسه."),
    event: { type: "mockup_approved", titleAr: "اعتمدت الموكاب" },
    message: "update",
  },
  request_mockup_changes: {
    paths: ["business"],
    from: isBizStage("approved", "mockup"),
    to: () => ({ status: "approved", bizStage: "mockup" }),
    permission: "messages.send",
    customerAllowed: true,
    guard: (_s, ctx) => (ctx.reason?.trim() ? null : "اكتب التعديلات المطلوبة على الموكاب."),
    event: { type: "mockup_changes_requested", titleAr: "طلبت تعديلات على الموكاب" },
    message: null,
    note: (ctx) => ctx.reason?.trim() ?? null,
  },
  confirm_deposit: {
    paths: ["business"],
    from: isBizStage("approved", "deposit"),
    to: () => ({ status: "approved", bizStage: "production" }),
    permission: "payments.confirm",
    guard: (_s, ctx) => (ctx.depositConfirmed ? null : "العربون لازم يتسجّل ويتأكد الأول."),
    event: { type: "deposit_confirmed", titleAr: "العربون اتأكد" },
    message: "update",
  },
  start_production: {
    paths: ["person", "business"],
    from: (s) =>
      pathOf(s) === "business" ? isBizStage("approved", "production")(s) : s.status === "approved",
    to: (s) => ({
      status: "in_production",
      bizStage: pathOf(s) === "business" ? "production" : null,
    }),
    permission: "production.update",
    // B3: no production before an approved mockup and a confirmed deposit (business).
    guard: (s, ctx) =>
      pathOf(s) === "business" && !(ctx.mockupApproved && ctx.depositConfirmed)
        ? "مينفعش نبدأ الإنتاج قبل اعتماد الموكاب وتأكيد العربون."
        : null,
    event: { type: "production_started", titleAr: "جاري التنفيذ" },
    message: "update",
  },
  send_to_qc: {
    paths: ["business"],
    from: isBizStage("in_production", "production"),
    to: () => ({ status: "in_production", bizStage: "qc" }),
    permission: "production.update",
    event: { type: "qc_started", titleAr: "فحص الجودة" },
    message: null,
  },
  mark_ready: {
    paths: ["person", "business"],
    from: (s) =>
      pathOf(s) === "business"
        ? isBizStage("in_production", "qc")(s)
        : s.status === "in_production",
    to: (s) => ({ status: "ready", bizStage: pathOf(s) === "business" ? "delivery" : null }),
    permission: "production.update",
    guard: (s, ctx) =>
      pathOf(s) === "business" && !ctx.qcPassed ? "لازم كل بنود فحص الجودة تبقى تمام." : null,
    event: { type: "ready", titleAr: "جاهز" },
    message: "ready",
  },
  deliver: {
    paths: ["person", "business"],
    from: isStatus("ready"),
    to: (s) => ({ status: "delivered", bizStage: pathOf(s) === "business" ? "done" : null }),
    permission: "delivery.handover",
    event: { type: "delivered", titleAr: "تم التسليم" },
    message: "thanks",
  },
  cancel: {
    paths: ["person", "business"],
    from: (s) => [...PRE_PRODUCTION, "awaiting_customer"].includes(s.status),
    to: (s) => ({ status: "cancelled", bizStage: keep(s) }),
    permission: "orders.approve",
    guard: (_s, ctx) => (ctx.reason?.trim() ? null : "اكتب سبب الإلغاء."),
    event: { type: "cancelled", titleAr: "اتلغى الطلب" },
    message: null,
    note: (ctx) => ctx.reason?.trim() ?? null,
  },
};

export function pathOf(state: Pick<OrderState, "customerType">): OrderPath {
  return state.customerType === "person" ? "person" : "business";
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "delivered" || status === "rejected" || status === "cancelled";
}

export function planTransition(
  state: OrderState,
  transition: TransitionName,
  actor: Actor,
  ctx: TransitionContext = {},
): Result<TransitionPlan, TransitionError> {
  const def = DEFINITIONS[transition];
  const fail = (code: TransitionErrorCode, message: string): Result<never, TransitionError> =>
    err({ code, transition, message, ...(def.permission ? { permission: def.permission } : {}) });

  if (!def.paths.includes(pathOf(state))) {
    return fail("wrong_path", "الإجراء ده مش متاح لنوع الطلب ده.");
  }
  if (!def.from(state)) {
    return fail("invalid_from_state", "مينفعش تعمل الإجراء ده والطلب في حالته الحالية.");
  }
  if (!actorMayRun(def, actor)) {
    return fail("forbidden", "الإجراء ده مش ضمن صلاحياتك.");
  }
  const guardMessage = def.guard?.(state, ctx);
  if (guardMessage) return fail("guard_failed", guardMessage);

  return ok({
    transition,
    from: state,
    to: def.to(state, ctx),
    event: {
      type: def.event.type,
      titleAr: def.event.titleAr,
      note: def.note?.(ctx) ?? null,
      visibleToCustomer: true,
    },
    message: def.message,
    activity: `orders.${transition}`,
  });
}

function actorMayRun(def: Definition, actor: Actor): boolean {
  if (actor.kind === "system") return false;
  if (actor.kind === "customer") return def.customerAllowed === true;
  return def.permission === null || actor.can(def.permission);
}

/** Transitions the actor can run right now, for rendering action buttons. */
export function availableTransitions(
  state: OrderState,
  actor: Actor,
  ctx: TransitionContext = {},
): TransitionName[] {
  return TRANSITIONS.filter((t) => planTransition(state, t, actor, ctx).ok);
}

export function requiredPermission(transition: TransitionName): Permission | null {
  return DEFINITIONS[transition].permission;
}

/** The 7-stage business rail shown on tracking and in the admin pipeline box (B6, B7). */
export const BIZ_RAIL: readonly BizStage[] = BIZ_STAGES.filter((s) => s !== "done");
