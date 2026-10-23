import type { Permission } from "./permissions";

/**
 * Dashboard sections and the permission each needs (brief B10). One map drives the sidebar,
 * the page guards and the forbidden page's "request access" button.
 */
export type DashboardSection = {
  href: `/dashboard${string}`;
  labelAr: string;
  icon: DashboardIcon;
  /** null = any active staff member. */
  permission: Permission | null;
  group: "main" | "workspace" | "admin" | "account";
};

export type DashboardIcon =
  | "home"
  | "orders"
  | "traffic"
  | "products"
  | "gallery"
  | "content"
  | "team"
  | "accounts"
  | "desk"
  | "design"
  | "production"
  | "delivery"
  | "security";

export const DASHBOARD_SECTIONS: readonly DashboardSection[] = [
  { href: "/dashboard", labelAr: "الرئيسية", icon: "home", permission: null, group: "main" },
  {
    href: "/dashboard/orders",
    labelAr: "الطلبات",
    icon: "orders",
    permission: "orders.view",
    group: "main",
  },
  {
    href: "/dashboard/desk",
    labelAr: "شغل الاستقبال",
    icon: "desk",
    permission: "quotes.draft",
    group: "workspace",
  },
  {
    href: "/dashboard/design",
    labelAr: "شغل التصميم",
    icon: "design",
    permission: "mockups.manage",
    group: "workspace",
  },
  {
    href: "/dashboard/production",
    labelAr: "بورد الإنتاج",
    icon: "production",
    permission: "production.update",
    group: "workspace",
  },
  {
    href: "/dashboard/delivery",
    labelAr: "التسليم والتحصيل",
    icon: "delivery",
    permission: "delivery.handover",
    group: "workspace",
  },
  {
    href: "/dashboard/traffic",
    labelAr: "زيارات الموقع",
    icon: "traffic",
    permission: "traffic.view",
    group: "admin",
  },
  {
    href: "/dashboard/products",
    labelAr: "المنتجات والخدمات",
    icon: "products",
    permission: "catalog.manage",
    group: "admin",
  },
  {
    href: "/dashboard/gallery",
    labelAr: "معرض الأعمال",
    icon: "gallery",
    permission: "gallery.manage",
    group: "admin",
  },
  {
    href: "/dashboard/content",
    labelAr: "التواصل والمحتوى",
    icon: "content",
    permission: "content.manage",
    group: "admin",
  },
  {
    href: "/dashboard/team",
    labelAr: "نشاط الفريق",
    icon: "team",
    permission: "team.activity.view",
    group: "admin",
  },
  {
    href: "/dashboard/accounts",
    labelAr: "الحسابات والصلاحيات",
    icon: "accounts",
    permission: "accounts.manage",
    group: "admin",
  },
  {
    href: "/dashboard/security",
    labelAr: "أمان حسابي",
    icon: "security",
    permission: null,
    group: "account",
  },
];

/** The section a path belongs to: the longest matching href wins. */
export function sectionForPath(pathname: string): DashboardSection | undefined {
  return [...DASHBOARD_SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
}
