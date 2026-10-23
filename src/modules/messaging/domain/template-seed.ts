/**
 * Default WhatsApp templates (brief B8). The admin edits them from the dashboard.
 * approve / quote / update are verbatim from the brief; info / reject / ready / thanks follow
 * the same tone and are drafts for the shop to review.
 */
export const TEMPLATE_SEED: { key: string; body: string }[] = [
  {
    key: "approve",
    body: "أهلًا {name}، طلبك رقم {ref} من يوزرسيف اتقبل. {price_date} تقدر تتابع حالة طلبك من اللينك ده: {link} هتحتاج رقم الطلب ورقم موبايلك عشان تفتح الصفحة.",
  },
  {
    key: "quote",
    body: "أهلًا {name}، طلب {org} رقم {ref} من يوزرسيف اتراجع، وده عرض السعر: {quote} لو موافق رد علينا بـ «موافق» وهنبعتلك الموكاب للاعتماد. تقدر تتابع كل مراحل الطلب من هنا: {link}",
  },
  {
    key: "update",
    body: "أهلًا {name}، تحديث على طلب {org} رقم {ref}: {update} تابع كل المراحل من هنا: {link}",
  },
  {
    key: "info",
    body: "أهلًا {name}، محتاجين منك شوية بيانات عشان نكمّل طلبك رقم {ref} من يوزرسيف: {reason} تقدر ترد علينا هنا أو تتابع الطلب من اللينك ده: {link}",
  },
  {
    key: "reject",
    body: "أهلًا {name}، للأسف مش هنقدر ننفّذ طلبك رقم {ref} من يوزرسيف بالشكل ده: {reason} لو حابب نشوف بديل مناسب، رد علينا هنا.",
  },
  {
    key: "ready",
    body: "أهلًا {name}، طلبك رقم {ref} من يوزرسيف جاهز للاستلام. {update} تابع التفاصيل من هنا: {link}",
  },
  {
    key: "thanks",
    body: "أهلًا {name}، شكرًا إنك اخترت يوزرسيف! طلبك رقم {ref} اتسلّم. يسعدنا نسمع رأيك ونشتغل معاك تاني.",
  },
];
