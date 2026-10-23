/**
 * Source of truth for permission keys and the default role matrix (brief B9).
 * The seed writes these to `permissions` / `role_permissions`; at runtime the DB matrix wins,
 * since the admin can toggle any non-admin cell. Pure data, safe to import anywhere.
 */

export const ROLE_KEYS = ["admin", "desk", "design", "prod", "delivery"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLES: readonly { key: RoleKey; nameAr: string }[] = [
  { key: "admin", nameAr: "مدير" },
  { key: "desk", nameAr: "استقبال طلبات" },
  { key: "design", nameAr: "مصمم" },
  { key: "prod", nameAr: "إنتاج" },
  { key: "delivery", nameAr: "تسليم وتحصيل" },
];

type PermissionDef = {
  key: string;
  labelAr: string;
  groupKey: "orders" | "execution" | "site";
  /** Non-admin roles that have it by default. Admin always has every permission. */
  roles: readonly Exclude<RoleKey, "admin">[];
};

export const PERMISSIONS = [
  {
    key: "orders.view",
    labelAr: "رؤية الطلبات",
    groupKey: "orders",
    roles: ["desk", "design", "prod", "delivery"],
  },
  {
    key: "customers.view_phone",
    labelAr: "رؤية رقم العميل",
    groupKey: "orders",
    roles: ["desk", "delivery"],
  },
  {
    key: "orders.request_info",
    labelAr: "طلب بيانات من العميل",
    groupKey: "orders",
    roles: ["desk"],
  },
  { key: "quotes.draft", labelAr: "تجهيز عرض سعر", groupKey: "orders", roles: ["desk"] },
  {
    key: "orders.approve",
    labelAr: "الموافقة النهائية والأسعار",
    groupKey: "orders",
    roles: [],
  },
  {
    key: "messages.send",
    labelAr: "إرسال رسائل للعميل",
    groupKey: "orders",
    roles: ["desk", "delivery"],
  },
  { key: "mockups.manage", labelAr: "الموكابات", groupKey: "execution", roles: ["design"] },
  {
    key: "production.update",
    labelAr: "تحديث الإنتاج",
    groupKey: "execution",
    roles: ["prod"],
  },
  {
    key: "payments.record",
    labelAr: "تسجيل الدفعات",
    groupKey: "execution",
    roles: ["delivery"],
  },
  { key: "payments.confirm", labelAr: "تأكيد الدفعات", groupKey: "execution", roles: [] },
  {
    key: "delivery.handover",
    labelAr: "تسليم الطلبات",
    groupKey: "execution",
    roles: ["delivery"],
  },
  { key: "catalog.manage", labelAr: "المنتجات والخدمات", groupKey: "site", roles: [] },
  { key: "gallery.manage", labelAr: "معرض الأعمال", groupKey: "site", roles: ["design"] },
  { key: "content.manage", labelAr: "نصوص الموقع والتواصل", groupKey: "site", roles: ["design"] },
  { key: "traffic.view", labelAr: "زيارات الموقع", groupKey: "site", roles: [] },
  { key: "team.activity.view", labelAr: "نشاط الفريق", groupKey: "site", roles: [] },
  { key: "accounts.manage", labelAr: "الحسابات والصلاحيات", groupKey: "site", roles: [] },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS: readonly Permission[] = PERMISSIONS.map((p) => p.key);

export function isPermission(value: string): value is Permission {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Default permissions for a role, per B9. */
export function defaultPermissionsFor(role: RoleKey): Permission[] {
  if (role === "admin") return [...PERMISSION_KEYS];
  return PERMISSIONS.filter((p) => (p.roles as readonly string[]).includes(role)).map((p) => p.key);
}
