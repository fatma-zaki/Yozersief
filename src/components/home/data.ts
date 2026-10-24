import type { IconName } from "./Icon";

/**
 * Home page content, copied from the three designs (Main / Home-Tablet / Home-Mobile).
 * Where a breakpoint's design uses shorter copy, it is given as { d, t, m }.
 */
export type ByBreakpoint = { d: string; t: string; m: string };

export const WHATSAPP_URL = "https://wa.me/201116891025";
export const INSTAGRAM_URL = "https://www.instagram.com/youzersef";

export const NAV_LINKS = [
  { href: "#top", label: "الرئيسية" },
  { href: "#products", label: "المنتجات" },
  { href: "#gallery", label: "معرض الأعمال" },
  { href: "#about", label: "من نحن" },
  { href: "#contact", label: "تواصل معنا" },
] as const;

export const HERO_FEATURES: { t: string; icon: IconName }[] = [
  { t: "جودة عالية", icon: "gem" },
  { t: "توصيل سريع", icon: "truck" },
  { t: "تصاميم مخصصة", icon: "pen" },
  { t: "هدايا مميزة", icon: "gift" },
];

export type Product = {
  key: string;
  t: string;
  d: ByBreakpoint;
  img: string;
  /** Intrinsic size: the card height follows the photo, as in the design. */
  w: number;
  h: number;
  alt: string;
  href: string;
  label: string;
};

type CategoryCopy = { d: ByBreakpoint; alt: string; href?: string };

/**
 * Marketing copy per catalog category, from the designs. The card's title, photo and whether it
 * shows at all come from the catalog in the database (see `productCards`).
 */
const CATEGORY_COPY: Record<string, CategoryCopy> = {
  mug: {
    d: {
      d: "مجات بتصميماتك الخاصة للمناسبات والهدايا.",
      t: "مجات بتصميماتك الخاصة للمناسبات والهدايا.",
      m: "مجات بتصميماتك للمناسبات والهدايا.",
    },
    alt: "مج مطبوع",
  },
  wear: {
    d: {
      d: "تيشرتات، هوديز، كابات بجودة عالية وتصاميم مميزة.",
      t: "تيشرتات، هوديز، كابات بجودة عالية.",
      m: "تيشرتات، هوديز، كابات بجودة عالية.",
    },
    alt: "تيشيرت مطبوع",
    href: "/services/wear",
  },
  custom: {
    d: {
      d: "هدايا فريدة بتصميمات تناسب كل مناسبة.",
      t: "هدايا فريدة بتصميمات تناسب كل مناسبة.",
      m: "هدايا فريدة تناسب كل مناسبة.",
    },
    alt: "هدية مطبوعة بشعار يوزرسيف",
  },
  sticker: {
    d: {
      d: "استيكرات بجودة عالية ومطبوعات لمختلف الاستخدامات.",
      t: "استيكرات بجودة عالية لمختلف الاستخدامات.",
      m: "استيكرات بجودة عالية لكل الاستخدامات.",
    },
    alt: "استيكرات مطبوعة",
  },
  phone: {
    d: {
      d: "كفر بتصميمك لموديل موبايلك بالظبط.",
      t: "كفر بتصميمك لموديل موبايلك بالظبط.",
      m: "كفر بتصميمك لموديل موبايلك.",
    },
    alt: "كفر موبايل مطبوع",
  },
};

/** Home «منتجاتنا» cards: the categories customers can order, in the catalog's order. */
export function productCards(categories: readonly { key: string; name: string; img: string }[]) {
  return categories.map((c): Product => {
    const copy = CATEGORY_COPY[c.key];
    const d = copy?.d ?? { d: "", t: "", m: "" };
    return {
      key: c.key,
      t: c.name,
      d,
      img: c.img,
      w: 432,
      h: 348,
      alt: copy?.alt ?? c.name,
      href: copy?.href ?? `/order?category=${c.key}`,
      label: copy?.href ? `تفاصيل ${c.name}` : `اطلب ${c.name}`,
    };
  });
}

export const WHY: { t: ByBreakpoint; s: ByBreakpoint; icon: IconName }[] = [
  {
    t: { d: "جودة طباعة عالية", t: "جودة طباعة عالية", m: "جودة عالية" },
    s: {
      d: "خامات مميزة وطباعة احترافية.",
      t: "خامات مميزة وطباعة احترافية.",
      m: "خامات مميزة وطباعة احترافية.",
    },
    icon: "gem",
  },
  {
    t: { d: "توصيل سريع", t: "توصيل سريع", m: "توصيل سريع" },
    s: {
      d: "نهتم بوصول طلبك في أسرع وقت. [المناطق والمدة بانتظار التأكيد]",
      t: "نهتم بوصول طلبك في أسرع وقت. [المدة للتأكيد]",
      m: "[المناطق والمدة للتأكيد]",
    },
    icon: "truck",
  },
  {
    t: { d: "تصاميم مخصصة", t: "تصاميم مخصصة", m: "تصاميم مخصصة" },
    s: {
      d: "للمناسبات والطلبات الخاصة.",
      t: "للمناسبات والطلبات الخاصة.",
      m: "للمناسبات والطلبات الخاصة.",
    },
    icon: "pen",
  },
  {
    t: { d: "دعم مستمر", t: "دعم مستمر", m: "دعم مستمر" },
    s: {
      d: "فريق دائم لمساعدتك في كل خطوة.",
      t: "فريق دائم لمساعدتك في كل خطوة.",
      m: "معاك في كل خطوة.",
    },
    icon: "headset",
  },
];

export const STEPS: { n: string; t: string; s: ByBreakpoint; icon: IconName }[] = [
  {
    n: "1",
    t: "اختر المنتج",
    s: {
      d: "حدد نوع المنتج والمواصفات.",
      t: "حدد النوع والمواصفات.",
      m: "حدد النوع والمواصفات.",
    },
    icon: "shirt",
  },
  {
    n: "2",
    t: "أرسل تصميمك",
    s: {
      d: "ارفع تصميمك أو اطلب مساعدة.",
      t: "ارفع تصميمك أو اطلب مساعدة.",
      m: "أو اطلب مساعدة.",
    },
    icon: "image",
  },
  {
    n: "3",
    t: "نقوم بالطباعة",
    s: { d: "بعد مراجعة طلبك، نطبعه بأعلى جودة.", t: "بعد مراجعة طلبك.", m: "بعد مراجعة طلبك." },
    icon: "gear",
  },
  {
    n: "4",
    t: "استلم طلبك",
    s: {
      d: "من المحل أو بالتوصيل حسب المتاح.",
      t: "من المحل أو بالتوصيل.",
      m: "من المحل أو توصيل.",
    },
    icon: "truck",
  },
];

/** Placeholders only: real reviews are added with the customer's consent, never written for them. */
export const REVIEWS = [
  { q: "[رأي عميل حقيقي — يُضاف بعد موافقته]", n: "[اسم العميل]" },
  { q: "[رأي عميل حقيقي ثاني — يُضاف بعد موافقته]", n: "[اسم العميل]" },
  { q: "[رأي عميل حقيقي ثالث — يُضاف بعد موافقته]", n: "[اسم العميل]" },
];
