"use client";

import {
  BarChart3,
  Brush,
  ClipboardList,
  Factory,
  Home,
  Images,
  Inbox,
  type LucideIcon,
  Package,
  PanelsTopLeft,
  ShieldCheck,
  Truck,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { sectionForPath, type DashboardSection } from "@/lib/rbac/routes";

const ICONS: Record<DashboardSection["icon"], LucideIcon> = {
  home: Home,
  orders: Inbox,
  traffic: BarChart3,
  products: Package,
  gallery: Images,
  content: PanelsTopLeft,
  team: UsersRound,
  accounts: Users,
  desk: ClipboardList,
  design: Brush,
  production: Factory,
  delivery: Truck,
  security: ShieldCheck,
};

export type NavItem = Pick<DashboardSection, "href" | "labelAr" | "icon" | "group">;

function useActiveHref() {
  return sectionForPath(usePathname())?.href;
}

/** Sidebar links, grouped. Items are already filtered by permission on the server. */
export function SidebarLinks({
  items,
  groups,
}: {
  items: readonly NavItem[];
  groups: Record<NavItem["group"], string>;
}) {
  const active = useActiveHref();
  const order: NavItem["group"][] = ["main", "workspace", "admin", "account"];
  return (
    <>
      {order.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-4 pt-3 pb-1 text-xs font-bold text-white/50">{groups[group]}</p>
            {groupItems.map((item) => {
              const Icon = ICONS[item.icon];
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-input flex min-h-11 items-center gap-3 px-4 text-sm font-bold transition-colors duration-300",
                    isActive
                      ? "from-teal-2 to-deep bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_16px_rgb(126_232_199/0.35)]"
                      : "hover:text-mint text-white/80 hover:bg-white/10",
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {item.labelAr}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/** Phone bottom bar: the first four allowed sections. The rest stay in the header menu. */
export function MobileBottomNav({ items, label }: { items: readonly NavItem[]; label: string }) {
  const active = useActiveHref();
  return (
    <nav
      aria-label={label}
      className="glass-dark fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-[22px] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-white lg:hidden"
    >
      {items.slice(0, 4).map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-input flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-bold",
              isActive ? "text-mint" : "text-white/75",
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
            <span className="max-w-20 truncate">{item.labelAr}</span>
          </Link>
        );
      })}
    </nav>
  );
}
