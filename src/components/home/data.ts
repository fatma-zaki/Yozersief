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

const PRODUCTS: Record<string, Product> = {
  mug: {
    key: "mug",
    t: "المجات والكاسات",
    d: {
      d: "مجات بتصميماتك الخاصة للمناسبات والهدايا.",
      t: "مجات بتصميماتك الخاصة للمناسبات والهدايا.",
      m: "مجات بتصميماتك للمناسبات والهدايا.",
    },
    img: "/images/home/mug-bottle.jpg",
    w: 432,
    h: 348,
    alt: "مج مطبوع",
    href: "/order?category=mug",
    label: "اطلب المجات والكاسات",
  },
  wear: {
    key: "wear",
    t: "طباعة الملابس",
    d: {
      d: "تيشرتات، هوديز، كابات بجودة عالية وتصاميم مميزة.",
      t: "تيشرتات، هوديز، كابات بجودة عالية.",
      m: "تيشرتات، هوديز، كابات بجودة عالية.",
    },
    img: "/images/home/tshirt.jpg",
    w: 432,
    h: 364,
    alt: "تيشيرت مطبوع",
    href: "/services/wear",
    label: "تفاصيل طباعة الملابس",
  },
  gift: {
    key: "gift",
    t: "الهدايا المخصصة",
    d: {
      d: "هدايا فريدة بتصميمات تناسب كل مناسبة.",
      t: "هدايا فريدة بتصميمات تناسب كل مناسبة.",
      m: "هدايا فريدة تناسب كل مناسبة.",
    },
    img: "/images/home/shop-sign.jpg",
    w: 428,
    h: 348,
    alt: "هدية مطبوعة بشعار يوزرسيف",
    href: "/order?category=custom",
    label: "اطلب الهدايا المخصصة",
  },
  sticker: {
    key: "sticker",
    t: "الاستيكرات والمطبوعات",
    d: {
      d: "استيكرات بجودة عالية ومطبوعات لمختلف الاستخدامات.",
      t: "استيكرات بجودة عالية لمختلف الاستخدامات.",
      m: "استيكرات بجودة عالية لكل الاستخدامات.",
    },
    img: "/images/home/sticker.jpg",
    w: 432,
    h: 348,
    alt: "استيكرات مطبوعة",
    href: "/order?category=sticker",
    label: "اطلب الاستيكرات والمطبوعات",
  },
};

/** Desktop and tablet order (RTL grid: mugs first on the right). */
export const PRODUCTS_GRID = [PRODUCTS.mug!, PRODUCTS.wear!, PRODUCTS.gift!, PRODUCTS.sticker!];
/** The mobile design lists clothing first. */
export const PRODUCTS_MOBILE = [PRODUCTS.wear!, PRODUCTS.mug!, PRODUCTS.gift!, PRODUCTS.sticker!];

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

export type GalleryCategory = "all" | "wear" | "mug" | "cap" | "sticker";

export const GALLERY_CHIPS: { key: GalleryCategory; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "wear", label: "تيشرتات" },
  { key: "mug", label: "مجات" },
  { key: "cap", label: "كابات" },
  { key: "sticker", label: "استيكرات" },
];

/** Demo mockups shown until real, consented customer work is added (labelled «نموذج عرض»). */
export const GALLERY_ITEMS: { cat: Exclude<GalleryCategory, "all">; img: string; alt: string }[] = [
  { cat: "wear", img: "/images/home/hoodie.jpg", alt: "هودي مطبوع" },
  { cat: "mug", img: "/images/home/mug-bottle.jpg", alt: "مج ومطرة مطبوعين" },
  { cat: "cap", img: "/images/home/cap.jpg", alt: "كاب مطبوع" },
  { cat: "sticker", img: "/images/home/phone-cases.jpg", alt: "كفرات موبايل مطبوعة" },
  { cat: "wear", img: "/images/home/tshirt.jpg", alt: "تيشيرت مطبوع" },
  { cat: "sticker", img: "/images/home/sticker.jpg", alt: "استيكر مطبوع" },
  { cat: "sticker", img: "/images/home/shop-sign.jpg", alt: "لافتة محل" },
  { cat: "wear", img: "/images/home/heat-press.jpg", alt: "طباعة حرارية على تيشيرت" },
];

/** Placeholders only: real reviews are added with the customer's consent, never written for them. */
export const REVIEWS = [
  { q: "[رأي عميل حقيقي — يُضاف بعد موافقته]", n: "[اسم العميل]" },
  { q: "[رأي عميل حقيقي ثاني — يُضاف بعد موافقته]", n: "[اسم العميل]" },
  { q: "[رأي عميل حقيقي ثالث — يُضاف بعد موافقته]", n: "[اسم العميل]" },
];
