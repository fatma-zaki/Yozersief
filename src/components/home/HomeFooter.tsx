import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { INSTAGRAM_URL, WHATSAPP_URL } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { type Vars } from "./parts";

/** Tall emerald calligraphy — sits on the physical left of the footer. */
function FooterCalligraphy({ style }: { style: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets
    <img
      src="/brand/arabic_calligraphy_emerald.svg"
      alt=""
      aria-hidden="true"
      className={s.orn}
      style={style}
    />
  );
}

const QUICK = [
  { href: "#top", label: "الرئيسية" },
  { href: "#products", label: "المنتجات" },
  { href: "#gallery", label: "معرض الأعمال" },
  { href: "/track", label: "تتبّع طلبك" },
  { href: "/login", label: "دخول الإدارة" },
];
const PRODUCT_LINKS = [
  { href: "/services/wear", label: "طباعة الملابس" },
  { href: "/order?category=mug", label: "الأكواب والكؤوس" },
  { href: "/order?category=custom", label: "الهدايا المخصصة" },
  { href: "/order?category=sticker", label: "الملصقات" },
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

type SocialId = "whatsapp" | "instagram" | "facebook" | "tiktok";

const SOCIALS: { id: SocialId; label: string; href?: string }[] = [
  { id: "whatsapp", label: "واتساب", href: WHATSAPP_URL },
  { id: "instagram", label: "إنستغرام", href: INSTAGRAM_URL },
  { id: "facebook", label: "فيسبوك: يوزرسيف" },
  { id: "tiktok", label: "تيك توك: يوزرسيف" },
];

const SOCIAL_PATHS: Record<SocialId, string> = {
  whatsapp:
    "M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.45 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.24 8.23zm4.52-6.16c-.25-.13-1.47-.72-1.7-.8-.22-.09-.39-.13-.55.12-.17.25-.64.8-.78.97-.15.17-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.13-.55-1.35-.76-1.84-.2-.48-.4-.42-.55-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z",
  instagram:
    "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm6.4-8.5a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM12 4.4c2.1 0 2.4.01 3.22.05.78.03 1.2.16 1.48.28.37.14.64.32.92.6.28.28.46.55.6.92.11.28.24.7.27 1.48.04.82.05 1.11.05 3.22s-.01 2.4-.05 3.22c-.03.78-.16 1.2-.28 1.48-.14.37-.32.64-.6.92-.28.28-.55.46-.92.6-.28.11-.7.24-1.48.27-.82.04-1.11.05-3.22.05s-2.4-.01-3.22-.05c-.78-.03-1.2-.16-1.48-.28a2.5 2.5 0 0 1-.92-.6 2.5 2.5 0 0 1-.6-.92c-.11-.28-.24-.7-.27-1.48C4.41 14.4 4.4 14.11 4.4 12s.01-2.4.05-3.22c.03-.78.16-1.2.28-1.48.14-.37.32-.64.6-.92.28-.28.55-.46.92-.6.28-.11.7-.24 1.48-.27C9.6 4.41 9.89 4.4 12 4.4zm0-1.8c-2.16 0-2.43.01-3.28.05-.85.04-1.43.17-1.94.37a4.3 4.3 0 0 0-1.56 1.01 4.3 4.3 0 0 0-1.01 1.56c-.2.51-.33 1.09-.37 1.94C4.01 9.57 4 9.84 4 12s.01 2.43.05 3.28c.04.85.17 1.43.37 1.94.22.57.52 1.05 1.01 1.56.51.49.99.79 1.56 1.01.51.2 1.09.33 1.94.37.85.04 1.12.05 3.28.05s2.43-.01 3.28-.05c.85-.04 1.43-.17 1.94-.37a4.3 4.3 0 0 0 1.56-1.01 4.3 4.3 0 0 0 1.01-1.56c.2-.51.33-1.09.37-1.94.04-.85.05-1.12.05-3.28s-.01-2.43-.05-3.28c-.04-.85-.17-1.43-.37-1.94a4.3 4.3 0 0 0-1.01-1.56 4.3 4.3 0 0 0-1.56-1.01c-.51-.2-1.09-.33-1.94-.37C14.43 2.61 14.16 2.6 12 2.6z",
  facebook:
    "M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.09 15.84 2 14.64 2 11.9 2 10 3.66 10 6.7V9.5H7.5v4H10V22h4z",
  tiktok:
    "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .55.04.81.1v-3.5a6.37 6.37 0 0 0-.81-.05A6.34 6.34 0 0 0 3.15 15.34 6.34 6.34 0 0 0 9.49 21.7a6.34 6.34 0 0 0 6.34-6.34V8.86a8.16 8.16 0 0 0 4.76 1.52V6.93a4.85 4.85 0 0 1-1-.24z",
};

function SocialBrandIcon({ id, size = 20 }: { id: SocialId; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d={SOCIAL_PATHS[id]} />
    </svg>
  );
}

function SocialBtn({ id, label, href }: { id: SocialId; label: string; href?: string }) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 999,
    padding: 0,
  };
  if (href) {
    return (
      <a
        className={cn(s.btn, s.ghost)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        style={style}
      >
        <SocialBrandIcon id={id} />
      </a>
    );
  }
  return (
    <span className={s.ghost} aria-label={label} title={label} style={style}>
      <SocialBrandIcon id={id} />
    </span>
  );
}

function SocialRow({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, ...style }}>
      {SOCIALS.map((item) => (
        <SocialBtn key={item.id} {...item} />
      ))}
    </div>
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
  return (
    <div className={s.d} style={{ position: "relative", padding: "64px 24px 28px" }}>
      <FooterCalligraphy style={{ bottom: 36, left: 8, width: 220, height: 393 }} />
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
              يوزرسيف للطباعة والتخصيص في أسوان: تيشيرتات، هوديز، قبعات، أكواب، ملصقات وهدايا
              بتصميمك أنت.
            </p>
            <SocialRow />
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
              [البريد الإلكتروني — بانتظار التأكيد]
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
  const col = { display: "flex", flexDirection: "column", gap: 10, fontSize: 15 } as const;
  return (
    <div className={s.t} style={{ position: "relative", padding: "56px 24px 28px" }}>
      <FooterCalligraphy style={{ bottom: 40, left: 12, width: 180, height: 321 }} />
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
            يوزرسيف للطباعة والتخصيص في أسوان: تيشيرتات، هوديز، قبعات، أكواب، ملصقات وهدايا بتصميمك
            أنت.
          </p>
          <SocialRow />
        </div>
        <div style={col}>
          <Heading mb={4}>تواصل معنا</Heading>
          <a className={s.ftL} href={WHATSAPP_URL} dir="ltr">
            01116891025
          </a>
          <span className={s.fg} style={muted}>
            [البريد الإلكتروني — بانتظار التأكيد]
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
  const col = { display: "flex", flexDirection: "column", gap: 8, fontSize: 14 } as const;
  const link = { padding: "4px 0" };
  return (
    // Bottom padding leaves room for the floating bottom nav.
    <div className={s.m} style={{ position: "relative", padding: "40px 16px 120px" }}>
      <FooterCalligraphy style={{ bottom: 40, left: 8, width: 140, height: 250 }} />
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
            [البريد الإلكتروني — للتأكيد]
          </span>
          <span className={s.fg} style={muted}>
            أسوان، مصر
          </span>
        </div>
      </div>
      <SocialRow style={{ marginTop: 20, justifyContent: "center" }} />
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
