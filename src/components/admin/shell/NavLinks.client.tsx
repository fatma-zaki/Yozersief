"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { sectionForPath } from "@/lib/rbac/routes";
import s from "../admin.module.css";
import { Ic } from "../Ic";
import type { AdminNavItem, NavCounts } from "../nav";
import { sx } from "../theme";

function useActiveHref() {
  return sectionForPath(usePathname())?.href;
}

const LINK = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 48,
  padding: "10px 14px",
  borderRadius: 16,
  fontSize: 15,
  fontWeight: 700,
} as const;

export function SidebarLinks({
  items,
  counts,
}: {
  items: readonly AdminNavItem[];
  counts: NavCounts;
}) {
  const active = useActiveHref();
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {items.map((n) => {
        const cur = n.href === active;
        const count = counts[n.href] ?? 0;
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={cur ? "page" : undefined}
              {...(cur
                ? sx(
                    {
                      ...LINK,
                      background:
                        "linear-gradient(180deg,rgba(126,232,199,0.28),rgba(126,232,199,0.1))",
                      border: "1px solid rgba(126,232,199,0.7)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 18px rgba(126,232,199,0.3)",
                    },
                    {
                      background:
                        "linear-gradient(180deg,rgba(126,232,199,0.26),rgba(126,232,199,0.08))",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(126,232,199,0.25)",
                    },
                    s.sideL,
                  )
                : { className: s.sideL, style: { ...LINK, border: "1px solid transparent" } })}
            >
              <Ic d={n.icon} />
              <span style={{ flexGrow: 1 }}>{n.label}</span>
              {count ? (
                <span
                  {...sx(
                    {
                      minWidth: 24,
                      padding: "0 8px",
                      borderRadius: 999,
                      background: "#d6ae62",
                      color: "#030909",
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: "center",
                      boxShadow: "0 0 10px rgba(214,174,98,0.5)",
                    },
                    { boxShadow: "0 0 10px rgba(214,174,98,0.45)" },
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BottomNavLinks({ items }: { items: readonly AdminNavItem[] }) {
  const active = useActiveHref();
  return items.map((n) => {
    const cur = n.href === active;
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={cur ? "page" : undefined}
        className={cn(s.navItem)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          textDecoration: "none",
          fontSize: 11,
          fontWeight: cur ? 700 : 600,
          padding: "6px 0",
        }}
      >
        <Ic d={n.icon} />
        {n.short}
      </Link>
    );
  });
}
