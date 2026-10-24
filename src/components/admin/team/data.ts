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
    t: "منذ 20 دقيقة",
    yes: "اعتمد وأرسل إلى العميل",
    no: "أعده مع تعديل",
  },
  {
    id: 2,
    kind: "pay",
    by: 3,
    order: "YZ-W4N8TS",
    title: "تسجيل عربون",
    detail: "مقهى النخيل: [المبلغ] نقدًا في المتجر.",
    t: "منذ ساعة",
    yes: "تأكيد الدفعة",
    no: "غير مطابق",
  },
  {
    id: 3,
    kind: "forward",
    by: 4,
    order: "YZ-R5L1VB",
    title: "طلب فرد محوّل للموافقة",
    detail:
      "غطاء Samsung A54 — دقة الملف منخفضة وقد أبلغ المصمم. يحتاج إلى قرار: موافقة أم طلب ملف أفضل؟",
    t: "منذ ساعتين",
    yes: "افتح الطلب",
    no: "اطلب ملفًا أفضل",
  },
  {
    id: 4,
    kind: "perm",
    by: 2,
    order: "",
    title: "طلب صلاحية",
    detail: "طلب [اسم المصمم] الاطلاع على «الزيارات وحركة الزوار».",
    t: "أمس",
    yes: "اسمح",
    no: "ارفض",
  },
];

/** The sidebar badge on «نشاط الفريق». */
export const PENDING_DECISIONS = PENDING.length;
