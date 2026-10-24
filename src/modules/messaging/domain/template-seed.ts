/**
 * Default WhatsApp templates (brief B8). The admin edits them from the dashboard.
 * approve / quote / update are verbatim from the brief; info / reject / ready / thanks follow
 * the same tone and are drafts for the shop to review.
 */
export const TEMPLATE_SEED: { key: string; body: string }[] = [
  {
    key: "approve",
    body: "مرحبًا {name}، تم قبول طلبك رقم {ref} من يوزرسيف. {price_date} يمكنك متابعة حالة طلبك من هذا الرابط: {link} ستحتاج إلى رقم الطلب ورقم هاتفك لفتح الصفحة.",
  },
  {
    key: "quote",
    body: "مرحبًا {name}، تمت مراجعة طلب {org} رقم {ref} من يوزرسيف، وهذا عرض السعر: {quote} إذا كنت موافقًا فأرسل إلينا «موافق» وسنرسل إليك الموكاب للاعتماد. يمكنك متابعة جميع مراحل الطلب من هنا: {link}",
  },
  {
    key: "update",
    body: "مرحبًا {name}، تحديث بشأن طلب {org} رقم {ref}: {update} تابع جميع المراحل من هنا: {link}",
  },
  {
    key: "info",
    body: "مرحبًا {name}، نحتاج منك بعض البيانات لاستكمال طلبك رقم {ref} من يوزرسيف: {reason} يمكنك الرد علينا هنا أو متابعة الطلب من هذا الرابط: {link}",
  },
  {
    key: "reject",
    body: "مرحبًا {name}، نعتذر، لن نتمكن من تنفيذ طلبك رقم {ref} من يوزرسيف بهذا الشكل: {reason} إذا رغبت في أن نبحث عن بديل مناسب، فرد علينا هنا.",
  },
  {
    key: "ready",
    body: "مرحبًا {name}، طلبك رقم {ref} من يوزرسيف جاهز للاستلام. {update} تابع التفاصيل من هنا: {link}",
  },
  {
    key: "thanks",
    body: "مرحبًا {name}، شكرًا لاختيارك يوزرسيف! تم تسليم طلبك رقم {ref}. يسعدنا أن نسمع رأيك وأن نعمل معك مرة أخرى.",
  },
];
