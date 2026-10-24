import type { DashboardSection } from "@/lib/rbac";
import { P } from "./Ic";

export type AdminNavItem = {
  href: DashboardSection["href"];
  label: string;
  /** Label in the phone bottom bar (Admin-Mobile). */
  short: string;
  icon: string;
};

/** Sidebar items in the admin designs (Admin*.html), in their order. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: "/dashboard/orders", label: "الطلبات", short: "الطلبات", icon: P.orders },
  { href: "/dashboard/traffic", label: "الزيارات والترافيك", short: "الزيارات", icon: P.traffic },
  { href: "/dashboard/products", label: "الخدمات والمنتجات", short: "المنتجات", icon: P.grid },
  { href: "/dashboard/gallery", label: "أعمالنا", short: "أعمالنا", icon: P.photo },
  { href: "/dashboard/content", label: "التواصل والمحتوى", short: "المحتوى", icon: P.chat },
  { href: "/dashboard/team", label: "نشاط الفريق", short: "الفريق", icon: P.pulse },
  { href: "/dashboard/accounts", label: "الحسابات والصلاحيات", short: "الحسابات", icon: P.lock },
];

/** Team workspaces (Team-*.html) use the same sidebar with their own items. */
export const TEAM_NAV: readonly AdminNavItem[] = [
  { href: "/dashboard/desk", label: "استقبال الطلبات", short: "الطلبات", icon: P.inbox },
  {
    href: "/dashboard/design",
    label: "الموكابات والتصميم",
    short: "التصميم",
    icon: "M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 11a2 2 0 1 1-4 0 2 2 0 1 1 4 0",
  },
  {
    href: "/dashboard/production",
    label: "لوحة الإنتاج",
    short: "الإنتاج",
    icon: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  },
  { href: "/dashboard/delivery", label: "التسليم والتحصيل", short: "التسليم", icon: P.truck },
];

/** The sidebar badge on «الطلبات»: orders waiting for a decision. */
export type NavCounts = Partial<Record<DashboardSection["href"], number>>;
