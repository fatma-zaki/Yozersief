/**
 * All user-facing strings, Egyptian Arabic. Keep copy here so English can be added later (brief A5).
 * Placeholders use {name} style and are filled with `t()`.
 */
export const ar = {
  app: {
    name: "يوزرسيف",
    tagline: "طباعة على التيشيرتات والهوديز والمجات والكفرات والاستيكرات في أسوان",
    startOrder: "ابدأ طلبك",
    trackOrder: "تتبّع طلبك",
    pending: "[للتأكيد]",
  },
  errors: {
    generic: "حصلت مشكلة عندنا. جرّب تاني بعد شوية، ولو المشكلة فضلت كلّمنا على واتساب.",
    notFound: "مش لاقيين اللي بتدوّر عليه. اتأكد من اللينك أو رقم الطلب وجرّب تاني.",
    forbidden: "الصفحة دي مش ضمن صلاحياتك. تقدر تطلب الصلاحية من المدير.",
    unauthorized: "لازم تسجّل دخول الأول عشان تكمّل.",
    validation: "في بيانات محتاجة تتظبط. راجع الحقول اللي متعلّم عليها وجرّب تاني.",
    conflict: "البيانات دي اتغيّرت أو موجودة قبل كده. حدّث الصفحة وجرّب تاني.",
    rateLimited: "محاولات كتير ورا بعض. استنى دقيقة وجرّب تاني.",
    invalidPhone: "رقم الموبايل لازم يكون مصري ويبدأ بـ 010 أو 011 أو 012 أو 015 (11 رقم).",
  },
  forbidden: {
    title: "الصفحة دي مش ضمن صلاحياتك",
    body: "لو محتاج توصل للصفحة دي، اطلب الصلاحية والمدير هيراجع الطلب.",
    requestAccess: "اطلب الصلاحية",
    requested: "طلبك اتبعت للمدير.",
    backToDashboard: "ارجع للوحة التحكم",
  },
  notFound: {
    title: "الصفحة دي مش موجودة",
    body: "يمكن اللينك غلط أو الصفحة اتنقلت.",
    backHome: "ارجع للرئيسية",
  },
  money: {
    currency: "ج.م",
  },
} as const;

export type Dictionary = typeof ar;

/** Fill `{key}` placeholders. Unknown keys are left as-is so a missing value is visible, not silent. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
