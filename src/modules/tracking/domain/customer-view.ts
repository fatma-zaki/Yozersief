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

const PERSON_RAIL_LABELS = ["اتبعت", "مراجعة", "موافقة", "تنفيذ", "جاهز"] as const;

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
    description: "طلبك وصلنا وهيتراجع قريب. مفيش حاجة مطلوبة منك دلوقتي.",
  },
  in_review: {
    label: "قيد المراجعة",
    description: "يوزرسيف بيراجع التفاصيل والملفات.",
  },
  awaiting_customer: {
    label: "محتاجين بيانات منك",
    description: "المراجعة وقفت لحد ما تبعت المطلوب. لو عندك سؤال، كلّمنا على واتساب.",
  },
  approved: {
    label: "تمت الموافقة",
    description: "طلبك اتقبل. هنبلغك أول ما التنفيذ يبدأ.",
  },
  rejected: {
    label: "الطلب اترفض",
    description: "للأسف مش هنقدر ننفذ الطلب ده بشكله الحالي.",
  },
  in_production: {
    label: "جاري التنفيذ",
    description: "طلبك في مرحلة الطباعة.",
  },
  ready: {
    label: "جاهز للاستلام",
    description: "طلبك جاهز. تقدر تستلمه أو تستنى التوصيل حسب اختيارك.",
  },
  delivered: {
    label: "تم التسليم",
    description: "طلبك خلص. شكرًا إنك اخترت يوزرسيف.",
  },
  cancelled: {
    label: "الطلب اتلغى",
    description: "الطلب ده اتلغى. لو محتاج مساعدة، كلّمنا على واتساب.",
  },
};

const BIZ_STAGE_COPY: Record<BizStage, { label: string; description: string }> = {
  quote: {
    label: "بنجهّز عرض السعر",
    description: "بنراجع طلبك عشان نبعتلك عرض سعر رسمي.",
  },
  customer_approval: {
    label: "عرض السعر وصلك",
    description: "راجع العرض على واتساب، ولو تمام وافق عليه عشان نكمّل.",
  },
  mockup: {
    label: "اعتماد الموكاب",
    description: "جهزنا شكل التصميم. اعتمده أو اطلب تعديل من واتساب.",
  },
  deposit: {
    label: "مستنيين العربون",
    description: "الإنتاج هيبدأ أول ما العربون يتأكد.",
  },
  production: {
    label: "جاري الإنتاج",
    description: "بنطبع طلبك دلوقتي.",
  },
  qc: {
    label: "فحص الجودة",
    description: "بنراجع القطع قبل التسليم.",
  },
  delivery: {
    label: "جاهز للتسليم",
    description: "طلبك جاهز للاستلام أو التوصيل.",
  },
  done: {
    label: "اتسلم الطلب",
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
