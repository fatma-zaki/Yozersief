import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import s from "./home.module.css";

export type Vars = CSSProperties & Record<`--${string}`, string>;
export type Bp = "d" | "t" | "m";

/** Heading sizes from the three designs. */
const HEAD = {
  d: { gap: 10, h: 38, hl: 54, p: 16, pl: 28 },
  t: { gap: 8, h: 32, hl: 48, p: 15, pl: 26 },
  m: { gap: 8, h: 26, hl: 40, p: 14, pl: 24 },
} as const;

/**
 * Section heading: pill + h2 + optional lead. `onBand` = on a dark teal band in the light design.
 * `title` may contain a <Neon> or <NeonDark> span.
 */
export function SectionHead({
  bp,
  id,
  pill,
  title,
  lead,
  onBand,
  leadStyle,
  style,
  className,
}: {
  bp: Bp;
  id?: string;
  pill: string;
  title: ReactNode;
  lead?: ReactNode;
  onBand?: boolean;
  leadStyle?: CSSProperties;
  style?: CSSProperties;
  className?: string;
}) {
  const h = HEAD[bp];
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: h.gap,
        ...style,
      }}
    >
      <span className={cn(s.pill, onBand ? s.pillD : s.pillL)}>{pill}</span>
      <h2
        id={id}
        className={onBand ? s.onDark : s.ink}
        style={{ margin: 0, fontSize: h.h, lineHeight: `${h.hl}px`, fontWeight: 800 }}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={onBand ? s.onDarkMuted : s.muted}
          style={{ margin: 0, fontSize: h.p, lineHeight: `${h.pl}px`, ...leadStyle }}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export function Neon({ children }: { children: ReactNode }) {
  return <span className={s.neon}>{children}</span>;
}

/** Neon only in the dark design. */
export function NeonDark({ children }: { children: ReactNode }) {
  return <span className={s.neonDark}>{children}</span>;
}

/** Theme-dependent background layer (radial glows). */
export function Glow({ light, dark }: { light: string; dark: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(s.layer, s.bg)}
      style={{ "--bg-l": light, "--bg-d": dark } as Vars}
    />
  );
}

/**
 * Calligraphy ornament. The light design uses the teal outline on the page and the mint one on
 * dark bands; the dark design uses the mint one everywhere at lower opacity.
 */
export function Ornament({
  style,
  tone,
  light,
  dark,
}: {
  style: CSSProperties;
  /** Which ornament the light design uses here. */
  tone: "mint" | "teal";
  /** Opacities; omit for 1. `dark: "0"` hides it in the dark design. */
  light?: string;
  dark?: string;
}) {
  const darkOpacity = dark ?? light ?? "1";
  if (tone === "mint") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.orn, s.ornMint, s.op)}
        style={{ ...style, "--op-l": light ?? "1", "--op-d": darkOpacity } as Vars}
      />
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img
        src="/brand/ornament-teal.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.orn, s.lightOnly)}
        style={{ ...style, opacity: light ? Number(light) : undefined }}
      />
      {darkOpacity !== "0" ? (
        // eslint-disable-next-line @next/next/no-img-element -- decorative
        <img
          src="/brand/ornament-mint.svg"
          alt=""
          aria-hidden="true"
          className={cn(s.orn, s.ornMint, s.darkOnly)}
          style={{ ...style, opacity: Number(darkOpacity) }}
        />
      ) : null}
    </>
  );
}

/** Light design's curved hand-off at the top or bottom of a dark band. */
export function Curve({ bp, edge }: { bp: Bp; edge: "top" | "bottom" }) {
  const cfg = {
    d: { h: 64, inset: "-5%", blur: 30, off: 12 },
    t: { h: 48, inset: "-6%", blur: 28, off: 12 },
    m: { h: 36, inset: "-10%", blur: 24, off: 10 },
  }[bp];
  const top = edge === "top";
  return (
    <div
      aria-hidden="true"
      className={s.curve}
      style={{
        left: cfg.inset,
        right: cfg.inset,
        [top ? "top" : "bottom"]: -1,
        height: cfg.h,
        borderRadius: top ? "0 0 50% 50% / 0 0 100% 100%" : "50% 50% 0 0 / 100% 100% 0 0",
        boxShadow: top
          ? `0 1px 0 rgba(126,232,199,0.6), 0 ${cfg.off}px ${cfg.blur}px rgba(126,232,199,0.2)`
          : `0 -1px 0 rgba(126,232,199,0.6), 0 -${cfg.off}px ${cfg.blur}px rgba(126,232,199,0.2)`,
      }}
    />
  );
}

/** Dark design: glowing line between sections. Hidden in the light design. */
export function Divider({ style }: { style?: CSSProperties }) {
  return <div className={s.divider} aria-hidden="true" style={style} />;
}

/** Same text, different copy per breakpoint (the designs shorten some lines). */
export function ByBp({ d, t, m }: { d: ReactNode; t: ReactNode; m: ReactNode }) {
  return (
    <>
      <span className={s.d}>{d}</span>
      <span className={s.t}>{t}</span>
      <span className={s.m}>{m}</span>
    </>
  );
}
