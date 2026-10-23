import Link from "next/link";
import { cn } from "@/lib/cn";
import s from "./home.module.css";
import { Icon, type IconName } from "./Icon";

const ITEMS: { href: string; label: string; icon: IconName; current?: boolean }[] = [
  { href: "#top", label: "الرئيسية", icon: "home", current: true },
  { href: "#products", label: "المنتجات", icon: "grid" },
  { href: "#gallery", label: "أعمالنا", icon: "image" },
  { href: "/track", label: "طلباتي", icon: "orders" },
];

/** Floating bottom navigation, mobile design only, with the «ابدأ طلبك» button in the middle. */
export function BottomNav() {
  const [home, products, gallery, orders] = ITEMS;
  return (
    <nav aria-label="التنقل السفلي" className={cn(s.m, s.bottomNav)}>
      <div className={cn(s.glassNav, s.bottomNavBar)}>
        <NavItem item={home!} />
        <NavItem item={products!} />
        <Link
          href="/order"
          aria-label="ابدأ طلبك"
          className={cn(s.btn, s.cta)}
          style={{
            justifySelf: "center",
            width: 56,
            height: 56,
            marginTop: -26,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="plus" size={26} stroke={2.2} />
        </Link>
        <NavItem item={gallery!} />
        <NavItem item={orders!} />
      </div>
    </nav>
  );
}

function NavItem({ item }: { item: (typeof ITEMS)[number] }) {
  const style = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    fontSize: 11,
    fontWeight: item.current ? 700 : 600,
    padding: "6px 0",
    textDecoration: "none",
  } as const;
  const content = (
    <>
      <Icon name={item.icon} size={22} />
      {item.label}
    </>
  );
  return item.href.startsWith("/") ? (
    <Link href={item.href} className={s.bottomNavItem} style={style}>
      {content}
    </Link>
  ) : (
    <a
      href={item.href}
      className={s.bottomNavItem}
      aria-current={item.current ? "page" : undefined}
      style={style}
    >
      {content}
    </a>
  );
}
