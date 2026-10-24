"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { NAV_LINKS } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";

/** Floating glass header from the home designs (desktop / tablet / mobile). */
export function HomeHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const toggleSearch = () => {
    setSearchOpen((v) => !v);
    setMenuOpen(false);
  };
  const toggleMenu = () => {
    setMenuOpen((v) => !v);
    setSearchOpen(false);
  };
  // The design's search jumps to the products section.
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const iconBtn = cn(s.btn, s.ghost);
  const logo = (size: number, radius: number) => (
    <Link
      href="#top"
      aria-label="يوزرسيف — الصفحة الرئيسية"
      style={{ display: "block", flexShrink: 0 }}
    >
      <Image
        src="/brand/logo.jpg"
        alt="شعار يوزرسيف"
        width={size}
        height={size}
        priority
        style={{ display: "block", width: size, height: size, borderRadius: radius }}
      />
    </Link>
  );

  return (
    <header className={s.header}>
      {/* Desktop */}
      <div
        className={cn(s.d, s.glassNav)}
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderRadius: 26,
          padding: "8px 12px 8px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {logo(64, 16)}
        <nav
          aria-label="القائمة الرئيسية"
          style={{
            display: "flex",
            gap: 28,
            flexGrow: 1,
            justifyContent: "center",
            fontSize: 15,
            lineHeight: "24px",
            fontWeight: 700,
          }}
        >
          {NAV_LINKS.map((l, i) => (
            <a
              key={l.href}
              className={s.navL}
              href={l.href}
              aria-current={i === 0 ? "page" : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className={iconBtn}
            aria-label="بحث"
            aria-expanded={searchOpen}
            onClick={toggleSearch}
            style={iconBox(46, 16)}
          >
            <Icon name="search" size={20} />
          </button>
          <ThemeButton className={iconBtn} style={iconBox(46, 16)} />
          <Link
            href="/track"
            className={iconBtn}
            aria-label="طلباتي — تتبّع طلبك"
            style={iconBox(46, 16)}
          >
            <Icon name="orders" size={20} />
          </Link>
          <Link
            href="/order"
            className={cn(s.btn, s.cta)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              minHeight: 46,
              padding: "10px 22px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            ابدأ طلبك الآن
            <Icon name="arrowStart" size={20} stroke={2.2} />
          </Link>
        </div>
      </div>

      {/* Tablet */}
      <div
        className={cn(s.t, s.glassNav)}
        style={{
          borderRadius: 24,
          padding: "8px 10px 8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {logo(60, 16)}
        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className={iconBtn}
          aria-label="بحث"
          aria-expanded={searchOpen}
          onClick={toggleSearch}
          style={iconBox(46, 16)}
        >
          <Icon name="search" size={20} />
        </button>
        <ThemeButton className={iconBtn} style={iconBox(46, 16)} />
        <Link href="/track" className={iconBtn} aria-label="طلباتي" style={iconBox(46, 16)}>
          <Icon name="orders" size={20} />
        </Link>
        <Link
          href="/order"
          className={cn(s.btn, s.cta)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minHeight: 46,
            padding: "8px 20px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          ابدأ طلبك الآن
          <Icon name="arrowStart" size={20} stroke={2.2} />
        </Link>
        <button
          type="button"
          className={iconBtn}
          aria-label="فتح القائمة"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
          style={iconBox(46, 16)}
        >
          <Icon name="menu" />
        </button>
      </div>

      {/* Mobile */}
      <div
        className={cn(s.m, s.glassNav)}
        style={{
          borderRadius: 22,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {logo(52, 14)}
        <div style={{ display: "flex", gap: 6 }}>
          <ThemeButton className={iconBtn} style={iconBox(44, 14)} />
          <Link href="/track" className={iconBtn} aria-label="طلباتي" style={iconBox(44, 14)}>
            <Icon name="orders" size={20} />
          </Link>
          <button
            type="button"
            className={iconBtn}
            aria-label="بحث"
            aria-expanded={searchOpen}
            onClick={toggleSearch}
            style={iconBox(44, 14)}
          >
            <Icon name="search" size={20} />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <form role="search" className={cn(s.glassNav, s.searchForm)} onSubmit={onSearch}>
          <label htmlFor="site-q" className={s.srOnly}>
            ابحث في المنتجات
          </label>
          <input
            ref={searchRef}
            id="site-q"
            type="search"
            className={s.searchInput}
            placeholder="ابحث عن منتج: تيشيرت، مج، استيكر…"
          />
          <button type="submit" className={cn(s.btn, s.cta, s.searchSubmit)}>
            بحث
          </button>
        </form>
      ) : null}

      {menuOpen ? (
        <nav aria-label="القائمة" className={cn(s.glassNav, s.menu)}>
          {NAV_LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className={s.menuLink}
              aria-current={i === 0 ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

/**
 * Light/dark switch (not in the home designs; added on request). Both icons render and CSS shows
 * the right one, so the server HTML matches whatever theme the anti-flash script picked.
 */
function ThemeButton({ className, style }: { className: string; style: React.CSSProperties }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      className={className}
      aria-label="تبديل الوضع الفاتح والداكن"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      style={style}
    >
      <Icon name="moon" size={20} className={s.lightOnly} />
      <Icon name="sun" size={20} className={s.darkOnly} />
    </button>
  );
}

function iconBox(size: number, radius: number) {
  return {
    width: size,
    height: size,
    borderRadius: radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
