/** Demo decisions waiting for the admin (docs/design/Admin-Team.html). */

export type Kind = "quote" | "pay" | "forward" | "perm";

export const PENDING: {
  id: number;
  kind: Kind;
  /** Member id in TeamBoard's MEMBERS. */
  by: 1 | 2 | 3 | 4 | 5;
  order: string;
  title: string;
  detail: string;
  t: string;
  yes: string;
  no: string;
}[] = [
  {
    id: 1,
    kind: "quote",
    by: 4,
    order: "YZ-T9W4KD",
    title: "مسودة عرض سعر",
    detail: "مدرسة النور — هودي × 40: سعر القطعة [السعر] · الإجمالي [الإجمالي] · المدة [المدة].",
    t: "من 20 دقيقة",
    yes: "اعتمد وابعت للعميل",
    no: "رجّعه بتعديل",
  },
  {
    id: 2,
    kind: "pay",
    by: 3,
    order: "YZ-W4N8TS",
    title: "تسجيل عربون",
    detail: "كافيه النخيل: [المبلغ] كاش في المحل.",
    t: "من ساعة",
    yes: "تأكيد الدفعة",
    no: "مش مطابق",
  },
  {
    id: 3,
    kind: "forward",
    by: 4,
    order: "YZ-R5L1VB",
    title: "طلب فرد محوّل للموافقة",
    detail: "كفر Samsung A54 — الملف دقته قليلة والمصمم بلّغ. محتاج قرار: موافقة ولا طلب ملف أحسن؟",
    t: "من ساعتين",
    yes: "افتح الطلب",
    no: "اطلب ملف أحسن",
  },
  {
    id: 4,
    kind: "perm",
    by: 2,
    order: "",
    title: "طلب صلاحية",
    detail: "[اسم المصمم] طلب يشوف «الزيارات والترافيك».",
    t: "امبارح",
    yes: "اسمح",
    no: "ارفض",
  },
];

/** The sidebar badge on «نشاط الفريق». */
export const PENDING_DECISIONS = PENDING.length;
