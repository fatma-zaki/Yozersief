/**
 * The design, production and delivery workspaces (brief B10, docs/design/Team-*.html). Pure:
 * which orders each one shows, where each order stands, and the labels the screens use.
 */
import type { BizStage, CustomerType, OrderStatus } from "./lifecycle";

type Lifecycle = { status: OrderStatus; bizStage: BizStage | null; customerType: CustomerType };

/* ---------- Design ---------- */

export type MockupStatus = "with_desk" | "sent" | "approved" | "changes_requested";

/** «محتاج موكاب», «طلب تعديل», «مستني العميل», «عند الاستقبال». */
export type DesignState = "need" | "change" | "waiting" | "sent";

/** Business orders at the mockup stage (B3 step 5) are the designer's. */
export function isDesignJob(o: Lifecycle): boolean {
  return o.customerType !== "person" && o.status === "approved" && o.bizStage === "mockup";
}

export function designState(latest: MockupStatus | null): DesignState {
  switch (latest) {
    case "with_desk":
      return "sent";
    case "sent":
      return "waiting";
    case "changes_requested":
      return "change";
    default:
      return "need";
  }
}

/** A new version is uploaded only when nothing is waiting on the desk or the customer. */
export const canUploadMockup = (s: DesignState) => s === "need" || s === "change";

export function mockupVersionNote(status: MockupStatus): string {
  return {
    with_desk: "اترفعت — عند الاستقبال للمراجعة والإرسال",
    sent: "اتبعتت للعميل",
    changes_requested: "اتبعتت للعميل — طلب تعديل",
    approved: "اتعمدت من العميل",
  }[status];
}

/* ---------- Production ---------- */

export type ProductionColumn = "queue" | "print" | "qc" | "ready";
export type JobStage = "queue" | "printing" | "qc" | "ready";

/**
 * The board column, or null when the order is not production's. «جاهز للطباعة» is an approved
 * individual order, or a business order whose mockup and deposit are done (B3 step 7).
 */
export function productionColumn(o: Lifecycle, stage: JobStage | null): ProductionColumn | null {
  if (o.status === "approved") {
    return o.customerType === "person" || o.bizStage === "production" ? "queue" : null;
  }
  if (o.status === "in_production") return stage === "qc" || o.bizStage === "qc" ? "qc" : "print";
  if (o.status === "ready") return "ready";
  return null;
}

export const QC_CHECKS = [
  ["qcSizesOk", "المقاسات مطابقة"],
  ["qcNamesOk", "الأسماء مظبوطة"],
  ["qcPrintOk", "الطباعة واضحة"],
  ["qcCountOk", "العدد كامل"],
] as const;
export type QcKey = (typeof QC_CHECKS)[number][0];

export function clampCount(count: number, quantity: number): number {
  return Math.min(Math.max(0, Math.round(count)), quantity);
}

/* ---------- Delivery ---------- */

/** Wrong «آخر 3 أرقام» attempts before the handover locks and the admin is needed. */
export const MAX_CODE_ATTEMPTS = 5;

export type PaymentKind = "deposit" | "balance" | "full";

/** Before production a business payment is the deposit; later it is the balance. */
export function paymentKindFor(o: Lifecycle, hasPayments: boolean): PaymentKind {
  if (o.customerType !== "person" && o.status === "approved") {
    if (o.bizStage === "customer_approval" || o.bizStage === "mockup" || o.bizStage === "deposit") {
      return "deposit";
    }
  }
  return hasPayments ? "balance" : "full";
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: "عربون",
  balance: "المتبقي",
  full: "المبلغ كامل",
};

export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "كاش",
  transfer: "تحويل",
};

/** Orders a payment can be recorded on: decided, not yet closed. */
export function acceptsPayment(o: Lifecycle): boolean {
  return o.status === "approved" || o.status === "in_production" || o.status === "ready";
}
