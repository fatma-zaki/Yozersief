/**
 * Staff view of an order for the admin orders screen (brief B7, docs/design/Admin.html).
 * Pure: maps rows to labels, decides which lifecycle steps a decision runs, and which business
 * stage comes next. The application layer loads the rows and applies the transitions.
 */
import { ar } from "@/i18n/ar";
import { cairoDateString, formatShortDateTime } from "@/lib/format";
import { WEAR_SIZES } from "@/modules/catalog";
import {
  BIZ_STAGES,
  planTransition,
  type Actor,
  type BizStage,
  type CustomerType,
  type OrderState,
  type OrderStatus,
  type TransitionContext,
  type TransitionName,
} from "./lifecycle";

/** The five statuses of the design's filters and badges. */
export type AdminStatus = "new" | "review" | "awaiting" | "approved" | "rejected";

export type Decision = "approve" | "info" | "reject";

export function adminStatus(status: OrderStatus): AdminStatus {
  switch (status) {
    case "submitted":
      return "new";
    case "in_review":
      return "review";
    case "awaiting_customer":
      return "awaiting";
    case "rejected":
    case "cancelled":
      return "rejected";
    default:
      return "approved";
  }
}

/** Badge text for an individual's order; business orders show their stage instead. */
export function personStatusLabel(status: OrderStatus): string {
  return (
    {
      submitted: "جديد",
      in_review: "قيد المراجعة",
      awaiting_customer: "بانتظار العميل",
      approved: "تمت الموافقة",
      in_production: "جاري التنفيذ",
      ready: "جاهز",
      delivered: "تم التسليم",
      rejected: "مرفوض",
      cancelled: "اتلغى",
    } as const
  )[status];
}

/** Index into the 7-stage business rail; 7 = done. */
export function stageIndex(stage: BizStage | null): number {
  return stage ? BIZ_STAGES.indexOf(stage) : 0;
}

export type OrderFacts = {
  categoryKey: string;
  categoryName: string;
  productKey: string | null;
  productName: string | null;
  quantity: number | null;
  color: string | null;
  phoneModel: string | null;
  width: string | null;
  height: string | null;
  unit: string | null;
  shape: string | null;
  customText: string | null;
  description: string | null;
  notes: string | null;
  designNotes: string | null;
  needsDesignHelp: boolean;
  receiptMethod: "pickup" | "delivery";
  deliveryAddress: string | null;
  desiredDate: string | null;
  sizes: { size: string; qty: number }[];
  places: string[];
};

const L = ar.order.builder;
const label = <K extends string>(map: Partial<Record<K, string>>, key: string | null) =>
  key ? ((map as Record<string, string | undefined>)[key] ?? key) : null;

/** "تيشيرت أبيض × 12", "كفر iPhone 13 × 1", "استيكر دائري × 200". */
export function productLabel(o: OrderFacts): string {
  const qty = o.quantity ? ` × ${o.quantity}` : "";
  switch (o.categoryKey) {
    case "wear": {
      const color = o.color ? ` ${label(L.colors, o.color)}` : "";
      return `${o.productName ?? o.categoryName}${color}${qty}`;
    }
    case "mug":
      return `${o.productName ?? "مج"}${qty}`;
    case "phone":
      return `كفر${o.phoneModel ? ` ${o.phoneModel}` : ""}${qty}`;
    case "sticker":
      return `استيكر${o.shape ? ` ${label(L.shapes, o.shape)}` : ""}${qty}`;
    default:
      return o.categoryName;
  }
}

/** The «المواصفات» boxes, per category (brief B4). */
export function specList(o: OrderFacts): { k: string; v: string }[] {
  const specs: { k: string; v: string }[] = [];
  const add = (k: string, v: string | null | undefined) => {
    if (v) specs.push({ k, v });
  };
  if (o.categoryKey === "wear") {
    add("النوع", o.productName);
    add("اللون", label(L.colors, o.color));
    const sizes = [...o.sizes]
      .sort(
        (a, b) =>
          WEAR_SIZES.indexOf(a.size as (typeof WEAR_SIZES)[number]) -
          WEAR_SIZES.indexOf(b.size as (typeof WEAR_SIZES)[number]),
      )
      .map((s) => `${s.size}${s.qty}`)
      .join(" · ");
    add("المقاسات", sizes || null);
    if (!sizes) add("الكمية", o.quantity ? String(o.quantity) : null);
    add("الطباعة", o.places.map((p) => label(L.placeLabels, p)).join(" + ") || null);
  } else if (o.categoryKey === "mug") {
    add("النوع", o.productName);
    add("الكمية", o.quantity ? String(o.quantity) : null);
    add("التخصيص", o.customText);
  } else if (o.categoryKey === "phone") {
    add("الموديل", o.phoneModel);
    add("الكمية", o.quantity ? String(o.quantity) : null);
    add("النص", o.customText);
  } else if (o.categoryKey === "sticker") {
    const unit = label(L.units, o.unit) ?? "";
    add("المقاس", o.width && o.height ? `${o.width} × ${o.height} ${unit}`.trim() : null);
    add("الشكل", label(L.shapes, o.shape));
    add("الكمية", o.quantity ? String(o.quantity) : null);
  } else {
    add("النوع", o.categoryName);
  }
  if (o.needsDesignHelp) add("التصميم", "محتاج مساعدة في التصميم");
  if (o.receiptMethod === "delivery") add("عنوان التوصيل", o.deliveryAddress);
  return specs;
}

/** «ملاحظات العميل»: the idea, notes and design notes the customer wrote. */
export function customerNotes(o: OrderFacts): string {
  return [o.description, o.notes, o.designNotes ? `عن التصميم: ${o.designNotes}` : null]
    .filter(Boolean)
    .join("\n");
}

export function receiptLabel(method: "pickup" | "delivery"): string {
  return method === "pickup" ? "استلام من المحل" : "توصيل";
}

/** "مرغوب: 2 نوفمبر" or "مش محدد". `date` is a calendar date (YYYY-MM-DD). */
export function desiredLabel(date: string | null): string {
  if (!date) return "مش محدد";
  const d = new Date(`${date}T12:00:00Z`);
  const month = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    month: "long",
    timeZone: "UTC",
  }).format(d);
  return `مرغوب: ${d.getUTCDate()} ${month}`;
}

/** List time like the design: "النهارده 10:12 ص", "أمس 4:30 م", or "20 أكتوبر". */
export function whenLabel(at: Date, now: Date): string {
  const full = formatShortDateTime(at);
  const [day = "", month = "", ...time] = full.split(" ");
  const today = cairoDateString(now);
  const yesterday = cairoDateString(new Date(now.getTime() - 86_400_000));
  const date = cairoDateString(at);
  if (date === today) return `النهارده ${time.join(" ")}`;
  if (date === yesterday) return `أمس ${time.join(" ")}`;
  return `${day} ${month}`;
}

/**
 * The next lifecycle step behind a decision button, given the order's current state. The design
 * lets staff decide on a new or paused order directly, so a decision may first resume the order
 * and move it into review. The caller applies steps until `final`.
 */
export function decisionStep(
  state: OrderState,
  decision: Decision,
): { step: TransitionName; final: boolean } {
  if (state.status === "awaiting_customer" && decision !== "reject") {
    return { step: "customer_responded", final: false };
  }
  if (decision === "reject") return { step: "reject", final: true };
  if (decision === "info") return { step: "request_info", final: true };
  if (state.status === "submitted") return { step: "start_review", final: false };
  return {
    step: state.customerType === "person" ? "approve" : "approve_and_send_quote",
    final: true,
  };
}

/** At most this many steps per decision (resume → review → decide). */
export const MAX_DECISION_STEPS = 3;

/** Whether every step of a decision is allowed for this actor and state (text assumed given). */
export function canDecide(state: OrderState, decision: Decision, actor: Actor): boolean {
  let current = state;
  const ctx: TransitionContext = { reason: "x", quoteText: "x" };
  for (let i = 0; i < MAX_DECISION_STEPS; i++) {
    const { step, final } = decisionStep(current, decision);
    const planned = planTransition(current, step, actor, ctx);
    if (!planned.ok) return false;
    if (final) return true;
    current = { ...current, ...planned.value.to };
  }
  return false;
}

export type NextStage = { transition: TransitionName; label: string };

/** «سجّل المرحلة الجاية» on the business pipeline box (brief B7). */
export function nextStage(
  state: OrderState,
  bulk: { sample: boolean; batches: boolean },
): NextStage | null {
  if (state.customerType === "person") return null;
  const at = `${state.status}:${state.bizStage}`;
  const map: Record<string, NextStage> = {
    "approved:customer_approval": { transition: "accept_quote", label: "العميل وافق على العرض" },
    "approved:mockup": {
      transition: "approve_mockup",
      label: bulk.sample ? "العميل اعتمد الموكاب والعينة" : "العميل اعتمد الموكاب",
    },
    "approved:deposit": { transition: "confirm_deposit", label: "اتسجل استلام العربون" },
    "approved:production": { transition: "start_production", label: "ابدأ الإنتاج" },
    "in_production:production": { transition: "send_to_qc", label: "الإنتاج خلص" },
    "in_production:qc": { transition: "mark_ready", label: "الفحص تمام — جاهز للتسليم" },
    "ready:delivery": {
      transition: "deliver",
      label: bulk.batches ? "اتسلمت الدفعة الأخيرة" : "اتسلم الطلب",
    },
  };
  return map[at] ?? null;
}

/** The {update} text of the customer message prepared with a recorded stage. */
export function stageUpdateText(
  transition: TransitionName,
  facts: { sample: boolean; receiptMethod: "pickup" | "delivery" },
): string {
  switch (transition) {
    case "accept_quote":
      return `اتسجلت موافقتك على عرض السعر، وهنبعتلك الموكاب${facts.sample ? " والعينة" : ""} للاعتماد.`;
    case "approve_mockup":
      return "اتسجل اعتمادك للموكاب. فاضل العربون عشان نبدأ الإنتاج. [طرق الدفع بانتظار التأكيد]";
    case "confirm_deposit":
      return "استلمنا العربون وهنبدأ الإنتاج.";
    case "start_production":
      return "الإنتاج بدأ.";
    case "mark_ready":
      return facts.receiptMethod === "delivery" ? "هنتواصل معاك نحدد ميعاد التوصيل." : "";
    default:
      return "";
  }
}

export type { CustomerType };
