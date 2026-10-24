import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PublicCategory } from "@/modules/catalog";
import { productCards, type Product } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Glow, NeonDark, SectionHead, type Bp, type Vars } from "./parts";

/**
 * «منتجاتنا» (design: products section on all three breakpoints). The cards are the categories
 * the catalog offers right now; hiding products or categories in the dashboard updates them.
 */
export function Products({ categories }: { categories: PublicCategory[] }) {
  const cards = productCards(categories);
  return (
    <section
      id="products"
      aria-labelledby="prod-h"
      className={cn(s.section, s.bg, s.reveal)}
      style={{ "--bg-l": "transparent", "--bg-d": "#001b17" } as Vars}
    >
      {/* Desktop */}
      <div
        className={cn(s.d, s.pad)}
        style={
          {
            position: "relative",
            "--pad-l": "48px 24px 110px",
            "--pad-d": "96px 24px 110px",
          } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 12% 30%, rgba(126,232,199,0.35) 0, rgba(126,232,199,0) 28%), radial-gradient(circle at 88% 75%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 26%)"
          dark="radial-gradient(ellipse 35% 50% at 12% 30%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 35% 50% at 88% 75%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 36,
          }}
        >
          <Head bp="d" id="prod-h" />
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}
          >
            {cards.map((p) => (
              <Card key={p.key} p={p} bp="d" />
            ))}
          </div>
        </div>
      </div>

      {/* Tablet */}
      <div
        className={cn(s.t, s.pad)}
        style={
          { position: "relative", "--pad-l": "40px 24px 88px", "--pad-d": "72px 24px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 10% 25%, rgba(126,232,199,0.35) 0, rgba(126,232,199,0) 32%), radial-gradient(circle at 90% 80%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 30%)"
          dark="radial-gradient(ellipse 45% 45% at 10% 25%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 45% 45% at 90% 80%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="t" style={{ marginBottom: 32 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
          {cards.map((p) => (
            <Card key={p.key} p={p} bp="t" />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div
        className={cn(s.m, s.pad)}
        style={
          { position: "relative", "--pad-l": "28px 16px 64px", "--pad-d": "56px 16px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 10% 20%, rgba(126,232,199,0.35) 0, rgba(126,232,199,0) 40%), radial-gradient(circle at 90% 80%, rgba(126,232,199,0.3) 0, rgba(126,232,199,0) 40%)"
          dark="radial-gradient(ellipse 70% 40% at 10% 20%, rgba(5,64,57,0.6) 0%, rgba(5,64,57,0) 100%), radial-gradient(ellipse 70% 40% at 90% 80%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <Head bp="m" style={{ marginBottom: 24 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cards.map((p) => (
            <Card key={p.key} p={p} bp="m" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Head({ bp, id, style }: { bp: Bp; id?: string; style?: React.CSSProperties }) {
  return (
    <SectionHead
      bp={bp}
      id={id}
      pill="منتجاتنا"
      title={
        <>
          كل ما تحتاجه في <NeonDark>مكان واحد</NeonDark>
        </>
      }
      lead={
        bp === "m"
          ? "مطبوعات وهدايا مخصصة لكل احتياجاتك."
          : "مجموعة متنوعة من المطبوعات والهدايا المخصصة لتناسب جميع احتياجاتك."
      }
      style={style}
    />
  );
}

const CARD = {
  d: {
    r: 26,
    pad: 14,
    gap: 18,
    minH: 210,
    tGap: 6,
    tPad: "12px 8px 8px",
    h: 22,
    hl: 34,
    p: 14,
    pl: 24,
    aTop: 10,
    ai: 20,
    img: "46%",
    ir: 20,
  },
  t: {
    r: 24,
    pad: 12,
    gap: 12,
    minH: 180,
    tGap: 4,
    tPad: "8px 6px 4px",
    h: 19,
    hl: 30,
    p: 13,
    pl: 22,
    aTop: 8,
    ai: 20,
    img: "44%",
    ir: 18,
  },
  m: {
    r: 22,
    pad: 10,
    gap: 12,
    minH: 140,
    tGap: 4,
    tPad: "8px 6px 4px",
    h: 18,
    hl: 28,
    p: 13,
    pl: 21,
    aTop: 8,
    ai: 18,
    img: "42%",
    ir: 16,
  },
} as const;

function Card({ p, bp }: { p: Product; bp: Bp }) {
  const c = CARD[bp];
  return (
    <article
      className={cn(s.pcard, s.glLight)}
      style={{
        borderRadius: c.r,
        padding: c.pad,
        display: "flex",
        alignItems: "stretch",
        gap: c.gap,
        minHeight: c.minH,
      }}
    >
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: c.tGap,
          padding: c.tPad,
        }}
      >
        <h3
          className={s.ink}
          style={{ margin: 0, fontSize: c.h, lineHeight: `${c.hl}px`, fontWeight: 800 }}
        >
          {p.t}
        </h3>
        <p
          className={s.muted}
          style={{ margin: 0, fontSize: c.p, lineHeight: `${c.pl}px`, flexGrow: 1 }}
        >
          {p.d[bp]}
        </p>
        <Link
          href={p.href}
          aria-label={p.label}
          className={cn(s.btn, s.arrow)}
          style={{ marginTop: c.aTop }}
        >
          <Icon name="arrowStart" size={c.ai} stroke={2.2} />
        </Link>
      </div>
      <div
        className={s.bg}
        style={
          {
            flex: `0 0 ${c.img}`,
            width: c.img,
            borderRadius: c.ir,
            overflow: "hidden",
            "--bg-l": "#f0f0f0",
            "--bg-d": "#032722",
          } as Vars
        }
      >
        <Image
          src={p.img}
          alt={p.alt}
          width={p.w}
          height={p.h}
          sizes={
            bp === "d"
              ? "(min-width: 1100px) 260px, 1px"
              : bp === "t"
                ? "(min-width: 700px) 180px, 1px"
                : "(max-width: 699px) 160px, 1px"
          }
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    </article>
  );
}
