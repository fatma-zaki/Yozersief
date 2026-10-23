import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { INSTAGRAM_URL, WHATSAPP_URL } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Ornament, type Vars } from "./parts";

const QUICK = [
  { href: "#top", label: "الرئيسية" },
  { href: "#products", label: "المنتجات" },
  { href: "#gallery", label: "معرض الأعمال" },
  { href: "/track", label: "تتبّع طلبك" },
  { href: "/login", label: "دخول الإدارة" },
];
const PRODUCT_LINKS = [
  { href: "/services/wear", label: "طباعة الملابس" },
  { href: "/order?category=mug", label: "المجات والكاسات" },
  { href: "/order?category=custom", label: "الهدايا المخصصة" },
  { href: "/order?category=sticker", label: "الاستيكرات" },
  { href: "#products", label: "جميع المنتجات" },
];

/** Site footer from the home designs. In the dark design a glowing line sits above it. */
export function HomeFooter() {
  return (
    <footer
      id="contact"
      className={cn(s.section, s.bg, s.footer, s.onDarkBand)}
      style={{ "--bg-l": "#002b28", "--bg-d": "#000e0c", color: "#ffffff" } as Vars}
    >
      <FooterDesktop />
      <FooterTablet />
      <FooterMobile />
    </footer>
  );
}

function Heading({
  children,
  size = 16,
  mb = 6,
  plainInDark,
}: {
  children: ReactNode;
  size?: number;
  mb?: number;
  /** The mobile dark design uses plain white headings. */
  plainInDark?: boolean;
}) {
  return (
    <h2
      className={cn(s.neon, plainInDark && s.plainInDark)}
      style={{ margin: `0 0 ${mb}px`, fontSize: size, fontWeight: 800 }}
    >
      {children}
    </h2>
  );
}

function SocialChip({
  href,
  children,
  size,
}: {
  href?: string;
  children: ReactNode;
  size: CSSProperties;
}) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 40,
    borderRadius: 999,
    fontWeight: 700,
    ...size,
  };
  return href ? (
    <a
      className={cn(s.btn, s.ghost)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
    >
      {children}
    </a>
  ) : (
    <span className={s.ghost} style={style}>
      {children}
    </span>
  );
}

function FooterLink({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return href.startsWith("/") ? (
    <Link className={s.ftL} href={href} style={style}>
      {children}
    </Link>
  ) : (
    <a className={s.ftL} href={href} style={style}>
      {children}
    </a>
  );
}

const muted = {
  "--fg-l": "rgba(255,255,255,0.78)",
  "--fg-d": "rgba(242,251,248,0.68)",
} as Vars;

function Rights({ style }: { style?: CSSProperties }) {
  return <span style={style}>جميع الحقوق محفوظة © 2026 يوزرسيف</span>;
}

function FooterDesktop() {
  const chip = { padding: "6px 16px", fontSize: 13 };
  return (
    <div className={s.d} style={{ position: "relative", padding: "64px 24px 28px" }}>
      <Ornament
        tone="mint"
        style={{ bottom: -260, left: -220, width: 600, height: 600, transform: "rotate(180deg)" }}
        light=".5"
        dark=".3"
      />
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "space-between" }}
        >
          <div
            id="about"
            style={{ flex: "1.3 1 280px", display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Image
              src="/brand/logo.jpg"
              alt="شعار يوزرسيف"
              width={112}
              height={112}
              style={{ width: 112, height: 112, borderRadius: 22, display: "block" }}
            />
            <p
              className={s.fg}
              style={{ ...muted, margin: 0, maxWidth: 320, fontSize: 14, lineHeight: "26px" }}
            >
              يوزرسيف للطباعة والتخصيص في أسوان: تيشرتات، هوديز، كابات، مجات، استيكرات وهدايا
              بتصميمك أنت.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SocialChip href={WHATSAPP_URL} size={chip}>
                واتساب
              </SocialChip>
              <SocialChip href={INSTAGRAM_URL} size={chip}>
                انستجرام
              </SocialChip>
              <SocialChip size={chip}>فيسبوك: يوزرسيف</SocialChip>
              <SocialChip size={chip}>تيك توك: يوزرسيف</SocialChip>
            </div>
          </div>
          <nav
            aria-label="روابط سريعة"
            style={{
              flex: "1 1 150px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 15,
            }}
          >
            <Heading>روابط سريعة</Heading>
            {QUICK.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </nav>
          <nav
            aria-label="المنتجات"
            style={{
              flex: "1 1 150px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 15,
            }}
          >
            <Heading>المنتجات</Heading>
            {PRODUCT_LINKS.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </nav>
          <div
            style={{
              flex: "1 1 200px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              fontSize: 15,
            }}
          >
            <Heading>تواصل معنا</Heading>
            <a
              className={s.ftL}
              href={WHATSAPP_URL}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="chat" size={18} style={{ color: "#7ee8c7" }} />
              <span dir="ltr">01116891025</span>
            </a>
            <span
              className={s.fg}
              style={{ ...muted, display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="mail" size={18} style={{ color: "#7ee8c7" }} />
              [الإيميل — بانتظار التأكيد]
            </span>
            <span
              className={s.fg}
              style={{ ...muted, display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="pin" size={18} style={{ color: "#7ee8c7" }} />
              أسوان، مصر
            </span>
          </div>
        </div>
        <BottomBar style={{ paddingTop: 22, flexWrap: "wrap" }} />
      </div>
    </div>
  );
}

function BottomBar({ style }: { style?: CSSProperties }) {
  return (
    <div
      className={cn(s.footerBar)}
      style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, ...style }}
    >
      <Rights />
      <div style={{ display: "flex", gap: 18 }}>
        <a className={s.ftL} href="#privacy" style={{ color: "inherit" }}>
          سياسة الخصوصية
        </a>
        <a className={s.ftL} href="#terms" style={{ color: "inherit" }}>
          الشروط والأحكام
        </a>
      </div>
    </div>
  );
}

function FooterTablet() {
  const chip = { padding: "6px 16px", fontSize: 13 };
  const col = { display: "flex", flexDirection: "column", gap: 10, fontSize: 15 } as const;
  return (
    <div className={s.t} style={{ position: "relative", padding: "56px 24px 28px" }}>
      <Ornament
        tone="mint"
        style={{ bottom: -220, left: -200, width: 500, height: 500, transform: "rotate(180deg)" }}
        light=".5"
        dark=".3"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "36px 32px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Image
            src="/brand/logo.jpg"
            alt="شعار يوزرسيف"
            width={100}
            height={100}
            style={{ width: 100, height: 100, borderRadius: 22, display: "block" }}
          />
          <p className={s.fg} style={{ ...muted, margin: 0, fontSize: 14, lineHeight: "24px" }}>
            يوزرسيف للطباعة والتخصيص في أسوان: تيشرتات، هوديز، كابات، مجات، استيكرات وهدايا بتصميمك
            أنت.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <SocialChip href={WHATSAPP_URL} size={chip}>
              واتساب
            </SocialChip>
            <SocialChip href={INSTAGRAM_URL} size={chip}>
              انستجرام
            </SocialChip>
            <SocialChip size={chip}>فيسبوك · تيك توك</SocialChip>
          </div>
        </div>
        <div style={col}>
          <Heading mb={4}>تواصل معنا</Heading>
          <a className={s.ftL} href={WHATSAPP_URL} dir="ltr">
            01116891025
          </a>
          <span className={s.fg} style={muted}>
            [الإيميل — بانتظار التأكيد]
          </span>
          <span className={s.fg} style={muted}>
            أسوان، مصر
          </span>
        </div>
        <nav aria-label="روابط سريعة" style={col}>
          <Heading mb={4}>روابط سريعة</Heading>
          {QUICK.slice(1).map((l) => (
            <FooterLink key={l.label} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </nav>
        <nav aria-label="المنتجات" style={col}>
          <Heading mb={4}>المنتجات</Heading>
          {PRODUCT_LINKS.slice(0, 4).map((l) => (
            <FooterLink key={l.label} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </nav>
      </div>
      <BottomBar style={{ marginTop: 32, paddingTop: 20 }} />
    </div>
  );
}

function FooterMobile() {
  const chip = { padding: "4px 14px", fontSize: 12 };
  const col = { display: "flex", flexDirection: "column", gap: 8, fontSize: 14 } as const;
  const link = { padding: "4px 0" };
  return (
    // Bottom padding leaves room for the floating bottom nav.
    <div className={s.m} style={{ position: "relative", padding: "40px 16px 120px" }}>
      <Ornament
        tone="mint"
        style={{ bottom: -140, left: -160, width: 400, height: 400, transform: "rotate(180deg)" }}
        light=".5"
        dark=".3"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 12,
        }}
      >
        <Image
          src="/brand/logo.jpg"
          alt="شعار يوزرسيف"
          width={96}
          height={96}
          style={{ width: 96, height: 96, borderRadius: 22, display: "block" }}
        />
        <p className={s.fg} style={{ ...muted, margin: 0, fontSize: 13, lineHeight: "22px" }}>
          يوزرسيف للطباعة والتخصيص في أسوان.
        </p>
      </div>
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <nav aria-label="روابط سريعة" style={col}>
          <Heading size={15} mb={4} plainInDark>
            روابط سريعة
          </Heading>
          {QUICK.slice(1, 4).map((l) => (
            <FooterLink key={l.label} href={l.href} style={link}>
              {l.label}
            </FooterLink>
          ))}
        </nav>
        <div style={col}>
          <Heading size={15} mb={4} plainInDark>
            تواصل معنا
          </Heading>
          <a className={s.ftL} href={WHATSAPP_URL} dir="ltr" style={link}>
            01116891025
          </a>
          <span className={s.fg} style={muted}>
            [الإيميل — للتأكيد]
          </span>
          <span className={s.fg} style={muted}>
            أسوان، مصر
          </span>
        </div>
      </div>
      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <SocialChip href={WHATSAPP_URL} size={chip}>
          واتساب
        </SocialChip>
        <SocialChip href={INSTAGRAM_URL} size={chip}>
          انستجرام
        </SocialChip>
        <SocialChip size={chip}>فيسبوك · تيك توك</SocialChip>
      </div>
      <p
        className={s.fg}
        style={
          {
            margin: "20px 0 0",
            textAlign: "center",
            fontSize: 12,
            "--fg-l": "rgba(255,255,255,0.6)",
            "--fg-d": "rgba(242,251,248,0.5)",
          } as Vars
        }
      >
        جميع الحقوق محفوظة © 2026 يوزرسيف
      </p>
    </div>
  );
}
