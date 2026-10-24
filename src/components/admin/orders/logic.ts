import type { CSSProperties } from "react";
import { P } from "../Ic";
import type { CustomerType, Order, OrderStatus } from "./data";

/** Business path stages shown in the order detail (Admin.html `STG`). */
export const STAGES = [
  "عرض السعر",
  "موافقة العميل",
  "الموكاب والعينة",
  "العربون",
  "الإنتاج",
  "فحص الجودة",
  "التسليم",
] as const;

export const CUSTOMER_TYPE: Record<CustomerType, string> = {
  person: "فرد",
  biz: "شركة أو متجر",
  group: "فريق أو جهة",
};

export const CUSTOMER_ICON: Record<CustomerType | "all", string> = {
  biz: P.biz,
  group: P.group,
  person: P.user,
  all: P.menu,
};

type Themed = { l: CSSProperties; d: CSSProperties };

/** Status label, icon and badge colours (light / dark). */
export const STATUS: Record<OrderStatus, { label: string; icon: string } & Themed> = {
  new: {
    label: "جديد",
    icon: P.sent,
    l: {
      background: "rgba(126,232,199,0.24)",
      color: "#005c58",
      border: "1px solid rgba(0,92,88,0.25)",
    },
    d: {
      background: "rgba(126,232,199,0.12)",
      color: "#b8f2de",
      border: "1px solid rgba(126,232,199,0.4)",
    },
  },
  review: {
    label: "قيد المراجعة",
    icon: P.eye,
    l: {
      background: "rgba(255,255,255,0.9)",
      color: "#005c58",
      border: "1px solid rgba(0,92,88,0.45)",
    },
    d: {
      background: "rgba(242,251,248,0.06)",
      color: "#f2fbf8",
      border: "1px solid rgba(242,251,248,0.35)",
    },
  },
  awaiting: {
    label: "بانتظار العميل",
    icon: P.warn,
    l: { background: "rgba(214,174,98,0.25)", color: "#5c430f", border: "1px solid #d6ae62" },
    d: { background: "rgba(214,174,98,0.14)", color: "#e9c98a", border: "1px solid #d6ae62" },
  },
  approved: {
    label: "تمت الموافقة",
    icon: P.ok,
    l: {
      background: "linear-gradient(180deg,#00706a,#004541)",
      color: "#ffffff",
      border: "1px solid rgba(126,232,199,0.6)",
      boxShadow: "0 0 10px rgba(126,232,199,0.4)",
    },
    d: {
      background: "linear-gradient(180deg,rgba(126,232,199,0.32),rgba(126,232,199,0.12))",
      color: "#ffffff",
      border: "1px solid rgba(126,232,199,0.85)",
      boxShadow: "0 0 10px rgba(126,232,199,0.35)",
    },
  },
  rejected: {
    label: "مرفوض",
    icon: P.no,
    l: { background: "rgba(3,9,9,0.82)", color: "#ffffff", border: "1px solid rgba(3,9,9,0.82)" },
    d: {
      background: "rgba(0,0,0,0.35)",
      color: "rgba(242,251,248,0.8)",
      border: "1px solid rgba(242,251,248,0.25)",
    },
  },
};

export const FILTERS: [OrderStatus | "all", string][] = [
  ["all", "الكل"],
  ["new", "جديد"],
  ["review", "قيد المراجعة"],
  ["awaiting", "بانتظار العميل"],
  ["approved", "تمت الموافقة"],
  ["rejected", "مرفوض"],
];

export const isOrg = (r: Order) => r.ctype !== "person";
export const isDecidable = (r: Order) =>
  ["new", "review", "awaiting"].includes(r.status) && (r.can.approve || r.can.info || r.can.reject);
export const isClosed = (r: Order) => ["approved", "rejected"].includes(r.status);
/** Status actions after the decision: the next step (individuals) and «إلغاء الطلب». */
export const hasStatusActions = (r: Order) => (!isOrg(r) && Boolean(r.next)) || r.can.cancel;

/** The list label: an approved organisation order shows its current stage instead. */
export function statusLabel(r: Order): string {
  if (isOrg(r) && r.status === "approved") return r.stage >= 7 ? "سُلّم" : (STAGES[r.stage] ?? "");
  return r.statusLabel;
}

export function bulkChips(r: Order): string[] {
  const b = r.bulk;
  return [
    b.sample ? "عينة قبل الإنتاج" : "",
    b.perPiece ? "اسم أو رقم لكل قطعة" : "",
    b.batches ? "تسليم على دفعات" : "",
    r.invoice ? "فاتورة" : "",
  ].filter(Boolean);
}

export type DialogKind = "approve" | "info" | "reject" | "cancel";

export type DialogSpec = {
  title: string;
  body: string;
  label: string;
  required: boolean;
  button: string;
  line: boolean;
  toast: string;
};

/** Decision dialogs (Admin.html `D`); approving an organisation order sends the quote. */
export function dialogSpec(kind: DialogKind, r: Order, mobile: boolean): DialogSpec {
  if (kind === "approve" && isOrg(r)) {
    return {
      title: "قبول الطلب وإرسال عرض السعر",
      body: `هذا طلب ${CUSTOMER_TYPE[r.ctype]} (${r.org}). سيصل العميل عرض سعر رسمي، ولن يبدأ الإنتاج إلا بعد موافقته واعتماد الموكاب والعربون.`,
      label: "عرض السعر: سعر القطعة، الإجمالي، ومدة التنفيذ (إجباري)",
      required: true,
      button: "إرسال عرض السعر",
      line: false,
      toast: "أُرسل عرض السعر للطلب ",
    };
  }
  const specs: Record<DialogKind, DialogSpec> = {
    approve: {
      title: mobile ? "تأكيد الموافقة" : "تأكيد الموافقة على الطلب",
      body: "سيعرف العميل أن طلبه قُبل. هذا لا يعني أن التنفيذ قد بدأ.",
      label: mobile ? "السعر والموعد (اختياري)" : "رسالة للعميل (السعر والموعد) — اختياري",
      required: false,
      button: "تأكيد الموافقة",
      line: false,
      toast: "سُجّلت الموافقة على ",
    },
    info: {
      title: "طلب بيانات من العميل",
      body: "سيتحول الطلب إلى «بانتظار العميل» حتى يرد.",
      label: "ما المطلوب تحديدًا؟",
      required: true,
      button: "أرسل الطلب إلى العميل",
      line: false,
      toast: mobile ? "أُرسل طلب البيانات إلى " : "أُرسل طلب البيانات إلى عميل ",
    },
    reject: {
      title: "رفض الطلب",
      body: mobile
        ? "سيصل القرار إلى العميل مع السبب."
        : "سيصل هذا القرار إلى العميل مع السبب. اكتب السبب بوضوح واقترح بديلًا إن وُجد.",
      label: "سبب الرفض (إجباري)",
      required: true,
      button: "تأكيد الرفض",
      line: true,
      toast: "سُجّل رفض ",
    },
    cancel: {
      title: "إلغاء الطلب",
      body: mobile
        ? "سيُغلق الطلب ولن يكتمل. سيظهر السبب للعميل في صفحة التتبع."
        : "سيُغلق الطلب ولن يكتمل في أي مرحلة. سيظهر السبب للعميل في صفحة التتبع، ولن تُرسل رسالة واتساب.",
      label: "سبب الإلغاء (إجباري)",
      required: true,
      button: "تأكيد الإلغاء",
      line: true,
      toast: "أُلغي الطلب ",
    },
  };
  return specs[kind];
}

/** Template key behind each dialog's customer message (brief B8). */
export function templateKey(kind: DialogKind, r: Order): string {
  if (kind === "approve") return isOrg(r) ? "quote" : "approve";
  return kind;
}

/**
 * The customer message as the outbox will render it: same template body, same variables
 * (see decideOrder). Unknown variables stay visible, like the server's renderTemplate.
 */
export function previewMessage(
  templates: Record<string, string>,
  kind: DialogKind,
  r: Order,
  text: string,
  link: string,
): string {
  const body = templates[templateKey(kind, r)] ?? "";
  const t = text.trim();
  const vars: Record<string, string> = {
    name: r.name.trim().split(/\s+/)[0] ?? r.name,
    ref: r.ref,
    org: r.org,
    link,
    ...(kind === "approve" ? (isOrg(r) ? { quote: t || "[عرض السعر]" } : { price_date: t }) : {}),
    ...(kind !== "approve" ? { reason: t || "[…]" } : {}),
  };
  return body
    .replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
