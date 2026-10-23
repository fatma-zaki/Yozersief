import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/layout/Logo";
import { Badge } from "@/components/ui/Badge";
import { Avatar, Skeleton } from "@/components/ui/Feedback";
import { ThemeToggle } from "@/components/ui/Providers.client";
import { ar } from "@/i18n/ar";
import { getStaffContext } from "@/lib/auth/session";
import { can, DASHBOARD_SECTIONS, ROLES } from "@/lib/rbac";
import { MobileBottomNav, SidebarLinks, type NavItem } from "./NavLinks.client";

/** Nav items the signed-in member may open: built from their permissions (brief A7). */
async function allowedNavItems(): Promise<NavItem[]> {
  const staff = await getStaffContext();
  if (!staff) return [];
  return DASHBOARD_SECTIONS.filter((s) => !s.permission || can(staff, s.permission)).map(
    ({ href, labelAr, icon, group }) => ({ href, labelAr, icon, group }),
  );
}

export async function DashboardSidebar() {
  const items = await allowedNavItems();
  return (
    <nav aria-label={ar.dashboard.nav} className="flex flex-col gap-2">
      <SidebarLinks items={items} groups={ar.dashboard.groups} />
    </nav>
  );
}

export async function DashboardBottomNav() {
  const items = await allowedNavItems();
  return <MobileBottomNav items={items} label={ar.dashboard.nav} />;
}

export async function DashboardUser() {
  const staff = await getStaffContext();
  if (!staff) return null;
  const role = ROLES.find((r) => r.key === staff.roleKey);
  return (
    <div className="flex items-center gap-3">
      <Avatar name={staff.name} />
      <div className="hidden flex-col sm:flex">
        <span className="text-sm font-extrabold">{staff.name}</span>
        <Badge tone="role" className="w-fit">
          {role?.nameAr}
        </Badge>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          aria-label={ar.auth.signOut}
          className="rounded-input text-ink-muted hover:bg-off-bg flex size-11 items-center justify-center"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export function SidebarFrame({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-card bg-band sticky top-4 hidden h-[calc(100dvh-2rem)] w-72 shrink-0 flex-col gap-4 overflow-y-auto p-4 text-white shadow-[0_18px_40px_rgb(0_20_18/0.3)] lg:flex">
      <div className="flex items-center gap-3 px-2">
        <Logo size={48} href="/dashboard" />
        <span className="text-lg font-extrabold">{ar.dashboard.title}</span>
      </div>
      {children}
    </aside>
  );
}

export function HeaderFrame({ children }: { children: React.ReactNode }) {
  return (
    <header className="glass rounded-card sticky top-4 z-30 flex min-h-16 items-center justify-between gap-4 px-4">
      <div className="flex items-center gap-2 lg:hidden">
        <Logo size={40} href="/dashboard" />
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle className="text-ink-muted hover:bg-off-bg" />
        {children}
      </div>
    </header>
  );
}

export function NavSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-11 bg-white/10" />
      ))}
    </div>
  );
}
