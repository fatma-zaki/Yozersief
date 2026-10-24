import Image from "next/image";
import { cache, type ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/ui/Providers.client";
import { getStaffContext } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { can, DASHBOARD_SECTIONS, ROLES } from "@/lib/rbac";
import { countNewOrders, countWorkspaceBadges } from "@/modules/orders";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { ADMIN_NAV, TEAM_NAV, type AdminNavItem, type NavCounts } from "../nav";
import { sx } from "../theme";
import { BottomNavLinks, SidebarLinks } from "./NavLinks.client";
import shell from "./shell.module.css";

/**
 * Dashboard page frame from the admin designs: page background + ornaments, the dark floating
 * sidebar (right in RTL) and the main column. Static: the session-dependent parts are passed in
 * as Suspense-wrapped children by the layout. The page ornament's position differs per design
 * screen; a screen states its variant with `data-ornament` on its root (see shell.module.css).
 */
export function ShellFrame({
  sidebar,
  bottomNav,
  children,
}: {
  sidebar: ReactNode;
  bottomNav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn(s.page, shell.root)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-teal.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.lightOnly, shell.orn)}
        style={{
          position: "absolute",
          zIndex: -1,
          left: -240,
          width: 680,
          height: 680,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        className={cn(s.darkOnly, shell.glow)}
        style={{
          position: "absolute",
          zIndex: -1,
          inset: 0,
          background:
            "radial-gradient(ellipse 40% 50% at 30% 20%, rgba(5,64,57,0.45) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 35% 45% at 60% 90%, rgba(5,64,57,0.35) 0%, rgba(5,64,57,0) 100%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.darkOnly, s.ornament, shell.orn, shell.ornDark)}
        style={{
          position: "absolute",
          zIndex: -1,
          left: -240,
          width: 680,
          height: 680,
          pointerEvents: "none",
        }}
      />
      {sidebar}
      <div className={shell.main}>{children}</div>
      {bottomNav}
    </div>
  );
}

/** The sidebar's static frame: background, glow, ornament, logo and title. */
export function SidebarFrame({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="قائمة الإدارة"
      {...sx(
        {
          position: "sticky",
          top: 16,
          overflow: "hidden",
          isolation: "isolate",
          flex: "1 1 248px",
          maxWidth: "100%",
          minHeight: "calc(100vh - 32px)",
          background: "#01302d",
          color: "#ffffff",
          borderRadius: 28,
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          border: "1px solid rgba(126,232,199,0.45)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 28px rgba(126,232,199,0.2), 0 20px 44px rgba(0,43,40,0.25)",
        },
        {
          background: "#032722",
          border: "1px solid rgba(126,232,199,0.35)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 26px rgba(126,232,199,0.12), 0 20px 44px rgba(0,0,0,0.4)",
        },
        cn(s.dk, s.slide, s.d, shell.sidebar),
      )}
    >
      <div
        aria-hidden="true"
        {...sx(
          {
            position: "absolute",
            zIndex: -1,
            inset: 0,
            background:
              "radial-gradient(ellipse 120% 50% at 70% 0%, rgba(0,92,88,0.95) 0%, rgba(0,92,88,0) 100%), radial-gradient(ellipse 100% 40% at 30% 100%, rgba(0,92,88,0.6) 0%, rgba(0,92,88,0) 100%)",
          },
          {
            background:
              "radial-gradient(ellipse 120% 50% at 70% 0%, rgba(5,64,57,0.95) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 100% 40% at 30% 100%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%)",
          },
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        {...sx(
          {
            position: "absolute",
            zIndex: -1,
            bottom: -10,
            right: 20,
            width: 280,
            height: 280,
            opacity: 0.55,
            pointerEvents: "none",
          },
          { opacity: 0.45 },
          s.ornament,
        )}
      />
      {children}
    </nav>
  );
}

function SidebarTitle({ team }: { team: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px" }}>
      <Image
        width={56}
        height={56}
        src="/brand/logo.jpg"
        alt="شعار يوزرسيف"
        {...sx(
          {
            width: 56,
            height: 56,
            borderRadius: 16,
            boxShadow: "0 0 0 1px rgba(126,232,199,0.4), 0 0 18px rgba(126,232,199,0.25)",
          },
          { boxShadow: "0 0 0 1px rgba(126,232,199,0.35), 0 0 18px rgba(126,232,199,0.2)" },
        )}
      />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <strong style={{ fontSize: 17 }}>
          {team ? "مساحة " : "لوحة "}
          <span className={s.neon} style={{ color: "#7ee8c7" }}>
            {team ? "الفريق" : "الإدارة"}
          </span>
        </strong>
        <span
          {...sx(
            { fontSize: 12, color: "rgba(255,255,255,0.72)" },
            { color: "rgba(242,251,248,0.68)" },
          )}
        >
          بيئة تجريبية
        </span>
      </span>
      <ThemeToggle className="ms-auto shrink-0" />
    </div>
  );
}

/**
 * The nav items this member may open: the design's admin list, or their team workspaces.
 * The sidebar and the phone bottom bar both need it: `cache` runs the badge queries once.
 */
const navFor = cache(
  async (): Promise<{
    items: AdminNavItem[];
    team: boolean;
    name: string;
    role: string;
    newOrders: number;
    workspaces: NavCounts;
  } | null> => {
    const staff = await getStaffContext();
    if (!staff) return null;
    const allowed = (href: string) => {
      const section = DASHBOARD_SECTIONS.find((x) => x.href === href);
      return !!section && (!section.permission || can(staff, section.permission));
    };
    const team = staff.roleKey !== "admin";
    const items = (team ? [...TEAM_NAV, ...ADMIN_NAV] : ADMIN_NAV).filter((i) => allowed(i.href));
    const role = ROLES.find((r) => r.key === staff.roleKey)?.nameAr ?? "";
    const [newOrders, workspaces] = await Promise.all([
      countNewOrders(staff),
      countWorkspaceBadges(staff),
    ]);
    return { items, team, name: staff.name, role, newOrders, workspaces };
  },
);

/**
 * `counts` are demo badges from screens without a backend yet; «الطلبات», «استقبال الطلبات» and
 * the team workspaces count real orders.
 */
export async function SidebarContent({ counts }: { counts: NavCounts }) {
  const nav = await navFor();
  if (!nav) return null;
  return (
    <>
      <SidebarTitle team={nav.team} />
      <SidebarLinks
        items={nav.items}
        counts={{
          ...counts,
          ...nav.workspaces,
          "/dashboard/orders": nav.newOrders,
          "/dashboard/desk": nav.newOrders,
        }}
      />
      {nav.team ? (
        <p
          style={{
            margin: "0 6px",
            padding: "10px 12px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px dashed rgba(126,232,199,0.3)",
            fontSize: 12,
            lineHeight: "19px",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          الأقسام الأخرى مخفية لأنها ليست ضمن صلاحيات دورك. يتحكم فيها المدير من «الحسابات
          والصلاحيات».
        </p>
      ) : null}
      <UserCard name={nav.name} role={nav.role} />
    </>
  );
}

function UserCard({ name, role }: { name: string; role: string }) {
  return (
    <div
      className={s.glassDark}
      style={{
        marginTop: "auto",
        padding: 12,
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        aria-hidden="true"
        {...sx(
          {
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 999,
            background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
            color: "#01302d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            boxShadow: "0 0 12px rgba(126,232,199,0.5)",
          },
          { color: "#001412", boxShadow: "0 0 12px rgba(126,232,199,0.45)" },
        )}
      >
        {name.trim().charAt(0)}
      </span>
      <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <a
          href="/dashboard/security"
          style={{ fontSize: 14, fontWeight: 700, color: "inherit", textDecoration: "none" }}
        >
          {name}
        </a>
        <span
          {...sx(
            { fontSize: 12, color: "rgba(255,255,255,0.72)" },
            { color: "rgba(242,251,248,0.68)" },
          )}
        >
          {role}
        </span>
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className={cn(s.btn, s.signOut)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Ic d={P.logout} size={16} />
          خروج
        </button>
      </form>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <>
      <SidebarTitle team={false} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            style={{ height: 48, borderRadius: 16, background: "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    </>
  );
}

/** Phone bottom bar (Admin-Mobile): the first three allowed sections, sign out, theme toggle. */
export async function BottomNav() {
  const nav = await navFor();
  if (!nav) return null;
  return (
    <nav aria-label="تنقل الإدارة" className={cn(s.m, shell.bottomNav)}>
      <div
        className={s.glassNav}
        style={{
          height: 72,
          borderRadius: 24,
          padding: 6,
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          alignItems: "center",
          color: "rgba(255,255,255,0.75)",
        }}
      >
        <BottomNavLinks items={nav.items.slice(0, 3)} />
        <form action={signOutAction} style={{ display: "contents" }}>
          <button
            type="submit"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: "inherit",
              background: "transparent",
              border: 0,
              fontSize: 11,
              fontWeight: 600,
              padding: "6px 0",
              cursor: "pointer",
            }}
          >
            <Ic d={P.logout} />
            خروج
          </button>
        </form>
        <ThemeToggle className="mx-auto" />
      </div>
    </nav>
  );
}
