/**
 * Customer-facing tracking projection. Maps lifecycle state to Arabic labels without
 * changing the underlying workflow. Only fields approved for the public tracking page.
 *
 * Status / biz_stage unions mirror `orders/domain/lifecycle` (kept local so this domain
 * file stays free of the orders barrel, which exports React UI).
 */

export type OrderStatus =
  | "submitted"
  | "in_review"
  | "awaiting_customer"
  | "approved"
  | "rejected"
  | "in_production"
  | "ready"
  | "delivered"
  | "cancelled";

export type BizStage =
  "quote" | "customer_approval" | "mockup" | "deposit" | "production" | "qc" | "delivery" | "done";

export type OrderPath = "person" | "business";

export type CustomerTrackingEvent = {
  id: number;
  titleAr: string;
  note: string | null;
  createdAt: string;
};

export type CustomerTrackingDto = {
  ref: string;
  status: OrderStatus;
  statusLabel: string;
  statusDescription: string;
  path: OrderPath;
  bizStage: BizStage | null;
  /** Index into the customer stage rail (0-based). */
  railIndex: number;
  railLabels: readonly string[];
  createdAt: string;
  desiredDate: string | null;
  receiptMethod: "pickup" | "delivery";
  /** Shown only when status is rejected; otherwise null. */
  rejectionReason: string | null;
  events: CustomerTrackingEvent[];
};

/** Keys that must never appear on a customer DTO (defence-in-depth for tests/serializers). */
export const CUSTOMER_DTO_PROHIBITED_KEYS = [
  "phone",
  "internalNote",
  "internal_note",
  "actorId",
  "actor_id",
  "assignedTo",
  "assigned_to",
  "customerId",
  "customer_id",
  "email",
  "activityLogs",
  "activity_logs",
  "idempotencyKeyHash",
  "finalPrice",
  "final_price",
] as const;

const PERSON_RAIL_LABELS = ["أُرسل", "مراجعة", "موافقة", "تنفيذ", "جاهز"] as const;

const BIZ_RAIL_LABELS = [
  "العرض",
  "موافقتك",
  "الموكاب",
  "العربون",
  "الإنتاج",
  "الفحص",
  "التسليم",
] as const;

/** Same order as orders `BIZ_RAIL` (excludes `done`). */
const BIZ_RAIL: readonly BizStage[] = [
  "quote",
  "customer_approval",
  "mockup",
  "deposit",
  "production",
  "qc",
  "delivery",
];

const STATUS_COPY: Record<OrderStatus, { label: string; description: string }> = {
  submitted: {
    label: "تم الإرسال",
    description: "وصلنا طلبك وستتم مراجعته قريبًا. لا شيء مطلوب منك الآن.",
  },
  in_review: {
    label: "قيد المراجعة",
    description: "تراجع يوزرسيف التفاصيل والملفات.",
  },
  awaiting_customer: {
    label: "نحتاج إلى بيانات منك",
    description: "توقفت المراجعة إلى أن ترسل المطلوب. إذا كان لديك سؤال، فتواصل معنا عبر واتساب.",
  },
  approved: {
    label: "تمت الموافقة",
    description: "قُبل طلبك. سنبلغك فور بدء التنفيذ.",
  },
  rejected: {
    label: "رُفض الطلب",
    description: "نعتذر، لن نتمكن من تنفيذ هذا الطلب بشكله الحالي.",
  },
  in_production: {
    label: "جارٍ التنفيذ",
    description: "طلبك في مرحلة الطباعة.",
  },
  ready: {
    label: "جاهز للاستلام",
    description: "طلبك جاهز. يمكنك استلامه أو انتظار التوصيل حسب اختيارك.",
  },
  delivered: {
    label: "تم التسليم",
    description: "اكتمل طلبك. شكرًا لاختيارك يوزرسيف.",
  },
  cancelled: {
    label: "أُلغي الطلب",
    description: "أُلغي هذا الطلب. إذا كنت بحاجة إلى مساعدة، فتواصل معنا عبر واتساب.",
  },
};

const BIZ_STAGE_COPY: Record<BizStage, { label: string; description: string }> = {
  quote: {
    label: "نُعدّ عرض السعر",
    description: "نراجع طلبك لنرسل إليك عرض سعر رسميًا.",
  },
  customer_approval: {
    label: "وصلك عرض السعر",
    description: "راجع العرض عبر واتساب، وإذا كان مناسبًا فوافق عليه لنواصل.",
  },
  mockup: {
    label: "اعتماد الموكاب",
    description: "جهّزنا شكل التصميم. اعتمده أو اطلب تعديلًا عبر واتساب.",
  },
  deposit: {
    label: "بانتظار العربون",
    description: "سيبدأ الإنتاج فور تأكيد العربون.",
  },
  production: {
    label: "جارٍ الإنتاج",
    description: "نطبع طلبك الآن.",
  },
  qc: {
    label: "فحص الجودة",
    description: "نراجع القطع قبل التسليم.",
  },
  delivery: {
    label: "جاهز للتسليم",
    description: "طلبك جاهز للاستلام أو التوصيل.",
  },
  done: {
    label: "تم تسليم الطلب",
    description: "شكرًا لثقتكم في يوزرسيف!",
  },
};

function pathOf(customerType: "person" | "biz" | "group"): OrderPath {
  return customerType === "person" ? "person" : "business";
}

/** Person path: 5-step rail index from status (design Track.html). */
export function personRailIndex(status: OrderStatus): number {
  switch (status) {
    case "submitted":
      return 0;
    case "in_review":
    case "awaiting_customer":
    case "rejected":
    case "cancelled":
      return 1;
    case "approved":
      return 2;
    case "in_production":
      return 3;
    case "ready":
    case "delivered":
      return 4;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function bizRailIndex(stage: BizStage | null): number {
  if (!stage || stage === "done") return BIZ_RAIL.length - 1;
  const idx = BIZ_RAIL.indexOf(stage);
  return idx < 0 ? 0 : idx;
}

export function customerStatusPresentation(
  status: OrderStatus,
  path: OrderPath,
  bizStage: BizStage | null,
): { label: string; description: string; railIndex: number; railLabels: readonly string[] } {
  if (path === "business" && bizStage) {
    const copy = BIZ_STAGE_COPY[bizStage];
    return {
      label: copy.label,
      description: copy.description,
      railIndex: bizRailIndex(bizStage),
      railLabels: BIZ_RAIL_LABELS,
    };
  }
  const copy = STATUS_COPY[status];
  return {
    label: copy.label,
    description: copy.description,
    railIndex: personRailIndex(status),
    railLabels: PERSON_RAIL_LABELS,
  };
}

export type OrderRowForCustomerView = {
  id: string;
  ref: string;
  status: OrderStatus;
  bizStage: BizStage | null;
  customerType: "person" | "biz" | "group";
  createdAt: Date;
  desiredDate: string | null;
  receiptMethod: "pickup" | "delivery";
  rejectionReason: string | null;
};

export type EventRowForCustomerView = {
  id: number;
  titleAr: string;
  note: string | null;
  createdAt: Date;
  visibleToCustomer: boolean;
};

/** Builds the public DTO. Filters staff-only events; never copies phone/internal fields. */
export function toCustomerTrackingDto(
  order: OrderRowForCustomerView,
  events: readonly EventRowForCustomerView[],
): CustomerTrackingDto {
  const path = pathOf(order.customerType);
  const presentation = customerStatusPresentation(order.status, path, order.bizStage);
  const visible = events
    .filter((e) => e.visibleToCustomer)
    .map((e): CustomerTrackingEvent => ({
      id: e.id,
      titleAr: e.titleAr,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    }));

  return {
    ref: order.ref,
    status: order.status,
    statusLabel: presentation.label,
    statusDescription: presentation.description,
    path,
    bizStage: order.bizStage,
    railIndex: presentation.railIndex,
    railLabels: presentation.railLabels,
    createdAt: order.createdAt.toISOString(),
    desiredDate: order.desiredDate,
    receiptMethod: order.receiptMethod,
    rejectionReason: order.status === "rejected" ? order.rejectionReason : null,
    events: visible,
  };
}

/** True when a plain object (DTO) contains any prohibited key at the top level. */
export function customerDtoHasProhibitedFields(dto: object): boolean {
  const keys = new Set(Object.keys(dto));
  return CUSTOMER_DTO_PROHIBITED_KEYS.some((k) => keys.has(k));
}
