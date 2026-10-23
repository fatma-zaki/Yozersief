import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { HERO_FEATURES } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Curve, Glow, Ornament, type Vars } from "./parts";

/** Hero band (design: Main / Home-Tablet / Home-Mobile, light and dark). */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-h"
      className={cn(s.section, s.bg, s.onDarkBand)}
      style={{ "--bg-l": "#01302d", "--bg-d": "#001412", color: "#ffffff" } as Vars}
    >
      <HeroDesktop />
      <HeroTablet />
      <HeroMobile />
    </section>
  );
}

function Title({ id, size, line }: { id?: string; size: number; line: number }) {
  return (
    <h1
      id={id}
      style={{
        margin: 0,
        fontSize: size,
        lineHeight: `${line}px`,
        fontWeight: 800,
        color: "#ffffff",
      }}
    >
      مطبوعات
      <br />
      <span className={s.neon}>تحكي قصتك</span>
    </h1>
  );
}

function Lead({ size, line, maxWidth }: { size: number; line: number; maxWidth?: number }) {
  return (
    <p
      className={s.fg}
      style={
        {
          margin: 0,
          maxWidth,
          fontSize: size,
          lineHeight: `${line}px`,
          fontWeight: 500,
          "--fg-l": "rgba(255,255,255,0.85)",
          "--fg-d": "rgba(242,251,248,0.75)",
        } as Vars
      }
    >
      تيشرتات، هوديز، كابات، مجات، استيكرات، هدايا والمزيد بتصميماتك الخاصة وبأعلى جودة.
    </p>
  );
}

function HeroDesktop() {
  return (
    <div className={s.d} style={{ position: "relative", paddingTop: 112 }}>
      <Glow
        light="radial-gradient(ellipse 45% 70% at 78% 40%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%), radial-gradient(ellipse 40% 60% at 28% 50%, rgba(0,92,88,0.6) 0%, rgba(0,92,88,0) 100%)"
        dark="radial-gradient(ellipse 45% 70% at 78% 40%, rgba(5,64,57,0.85) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 40% 60% at 28% 50%, rgba(3,39,34,0.9) 0%, rgba(3,39,34,0) 100%)"
      />
      <Ornament
        tone="mint"
        style={{ top: 250, right: -140, width: 580, height: 580, transform: "scaleX(-1)" }}
        light=".5"
        dark=".4"
      />
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          minHeight: 500,
        }}
      >
        <div
          style={{
            flex: "1 1 480px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 18,
            padding: "24px 0",
          }}
        >
          <span className={cn(s.pill, s.pillD)}>مطبوعات مميزة</span>
          <Title id="hero-h" size={68} line={88} />
          <Lead size={18} line={32} maxWidth={480} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            <Link
              href="/order"
              className={cn(s.btn, s.cta)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                minHeight: 58,
                padding: "14px 36px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              ابدأ طلبك الآن
              <Icon name="arrowStart" stroke={2.2} />
            </Link>
            <a
              href="#gallery"
              className={cn(s.btn, s.ghost)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 58,
                padding: "14px 28px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              شوف أعمالنا
            </a>
          </div>
        </div>
        <div
          style={{
            flex: "1.2 1 600px",
            minWidth: 0,
            alignSelf: "stretch",
            position: "relative",
            minHeight: 460,
          }}
        >
          <Image
            src="/images/home/hero-scene.jpg"
            alt="تيشيرت وهودي وكاب ومج وكفر موبايل مطبوع عليهم شعار يوزرسيف"
            fill
            priority
            sizes="(min-width: 1100px) 700px, 1px"
            className={s.heroScene}
            style={{ objectFit: "cover", objectPosition: "40% 60%" }}
          />
        </div>
      </div>
      <div
        style={{
          maxWidth: 1180,
          margin: "-20px auto 0",
          padding: "0 24px 104px",
          position: "relative",
        }}
      >
        <ul
          className={s.glDark}
          style={{
            listStyle: "none",
            margin: 0,
            padding: "22px 12px",
            borderRadius: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          {HERO_FEATURES.map((f, i) => (
            <li
              key={f.t}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: "6px 16px",
                borderRight: i > 0 ? "1px solid rgba(126,232,199,0.25)" : undefined,
              }}
            >
              <span className={s.ring} aria-hidden="true" style={{ width: 52, height: 52 }}>
                <Icon name={f.icon} />
              </span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{f.t}</span>
            </li>
          ))}
        </ul>
      </div>
      <Curve bp="d" edge="bottom" />
    </div>
  );
}

function HeroTablet() {
  return (
    <div
      className={cn(s.t, s.pad)}
      style={{ position: "relative", "--pad-l": "104px 0 96px", "--pad-d": "104px 0 72px" } as Vars}
    >
      <Glow
        light="radial-gradient(ellipse 55% 60% at 80% 40%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%), radial-gradient(ellipse 50% 60% at 25% 50%, rgba(0,92,88,0.6) 0%, rgba(0,92,88,0) 100%)"
        dark="radial-gradient(ellipse 55% 60% at 80% 40%, rgba(5,64,57,0.85) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 50% 60% at 25% 50%, rgba(3,39,34,0.9) 0%, rgba(3,39,34,0) 100%)"
      />
      <Ornament
        tone="mint"
        style={{ top: 220, right: -120, width: 500, height: 500, transform: "scaleX(-1)" }}
        light=".5"
        dark=".38"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 440 }}>
        <div
          style={{
            flex: "1 1 50%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 16,
            padding: "0 32px 0 8px",
          }}
        >
          <span className={cn(s.pill, s.pillD)}>مطبوعات مميزة</span>
          <Title size={52} line={70} />
          <Lead size={16} line={28} />
          <Link
            href="/order"
            className={cn(s.btn, s.cta)}
            style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              minHeight: 56,
              padding: "12px 32px",
              borderRadius: 999,
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            ابدأ طلبك الآن
            <Icon name="arrowStart" stroke={2.2} />
          </Link>
        </div>
        <div
          style={{
            flex: "1 1 50%",
            minWidth: 0,
            alignSelf: "stretch",
            position: "relative",
            minHeight: 420,
          }}
        >
          <Image
            src="/images/home/hero-scene.jpg"
            alt="تيشيرت وهودي وكاب ومج وكفر موبايل مطبوع عليهم شعار يوزرسيف"
            fill
            sizes="(min-width: 700px) and (max-width: 1099px) 550px, 1px"
            className={s.sceneTablet}
            style={{ objectFit: "cover", objectPosition: "35% 60%" }}
          />
        </div>
      </div>
      <div style={{ padding: "8px 24px 0" }}>
        <ul
          className={s.glDark}
          style={{
            listStyle: "none",
            margin: 0,
            padding: "18px 8px",
            borderRadius: 26,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
        >
          {HERO_FEATURES.map((f, i) => (
            <li
              key={f.t}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textAlign: "center",
                padding: "4px 8px",
                borderRight: i > 0 ? "1px solid rgba(126,232,199,0.25)" : undefined,
              }}
            >
              <span className={s.ring} aria-hidden="true" style={{ width: 48, height: 48 }}>
                <Icon name={f.icon} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{f.t}</span>
            </li>
          ))}
        </ul>
      </div>
      <Curve bp="t" edge="bottom" />
    </div>
  );
}

function HeroMobile() {
  return (
    <div
      className={cn(s.m, s.pad)}
      style={
        { position: "relative", "--pad-l": "92px 16px 64px", "--pad-d": "92px 16px 48px" } as Vars
      }
    >
      <Glow
        light="radial-gradient(ellipse 90% 40% at 70% 18%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%), radial-gradient(ellipse 90% 40% at 30% 65%, rgba(0,92,88,0.6) 0%, rgba(0,92,88,0) 100%)"
        dark="radial-gradient(ellipse 90% 40% at 70% 18%, rgba(5,64,57,0.85) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 90% 40% at 30% 65%, rgba(3,39,34,0.9) 0%, rgba(3,39,34,0) 100%)"
      />
      <Ornament
        tone="mint"
        style={{ top: 185, right: -80, width: 380, height: 380, transform: "scaleX(-1)" }}
        light=".5"
        dark=".35"
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
        <span className={cn(s.pill, s.pillD)}>مطبوعات مميزة</span>
        <Title size={44} line={60} />
        <Lead size={15} line={26} />
        <Link
          href="/order"
          className={cn(s.btn, s.cta)}
          style={{
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            minHeight: 54,
            borderRadius: 999,
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          ابدأ طلبك الآن
          <Icon name="arrowStart" stroke={2.2} />
        </Link>
      </div>
      <Image
        src="/images/home/idea-scene.jpg"
        alt="تيشيرت وهودي وكاب ومج وكفر موبايل مطبوع عليهم شعار يوزرسيف"
        width={900}
        height={669}
        priority
        sizes="(max-width: 699px) 100vw, 1px"
        className={s.sceneMobile}
        style={{
          display: "block",
          width: "calc(100% + 32px)",
          maxWidth: "none",
          margin: "8px -16px 0",
          height: "auto",
        }}
      />
      <ul
        className={s.glDark}
        style={{
          listStyle: "none",
          margin: "-24px 0 0",
          padding: "14px 4px",
          borderRadius: 22,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          position: "relative",
        }}
      >
        {HERO_FEATURES.map((f, i) => (
          <li
            key={f.t}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              textAlign: "center",
              padding: "2px 4px",
              borderRight: i > 0 ? "1px solid rgba(126,232,199,0.25)" : undefined,
            }}
          >
            <span className={s.ring} aria-hidden="true" style={{ width: 40, height: 40 }}>
              <Icon name={f.icon} size={20} />
            </span>
            <span style={{ fontSize: 12, lineHeight: "18px", fontWeight: 700 }}>{f.t}</span>
          </li>
        ))}
      </ul>
      <Curve bp="m" edge="bottom" />
    </div>
  );
}
