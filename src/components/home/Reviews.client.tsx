"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { REVIEWS } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { NeonDark, SectionHead, type Bp, type Vars } from "./parts";

/**
 * «آراء عملائنا». Placeholders only, as in the design: real reviews are added with the
 * customer's consent and are never written for them (brief B11).
 */
export function Reviews() {
  return (
    <section
      aria-labelledby="tst-h"
      className={cn(s.section, s.bg, s.reveal)}
      style={{ "--bg-l": "transparent", "--bg-d": "#001b17" } as Vars}
    >
      <div
        className={cn(s.d, s.pad)}
        style={
          { position: "relative", "--pad-l": "40px 24px 80px", "--pad-d": "72px 24px 80px" } as Vars
        }
      >
        <Quote mark="”" style={{ top: 120, right: "14%", fontSize: 220 }} light=".35" dark=".16" />
        <Quote mark="“" style={{ bottom: 40, left: "16%", fontSize: 180 }} light=".28" dark=".12" />
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
          }}
        >
          <Carousel bp="d" headId="tst-h" />
        </div>
      </div>
      <div
        className={cn(s.t, s.pad)}
        style={
          { position: "relative", "--pad-l": "24px 24px 72px", "--pad-d": "72px 24px" } as Vars
        }
      >
        <Quote mark="”" style={{ top: 90, right: "10%", fontSize: 180 }} light=".35" dark=".16" />
        <Quote mark="“" style={{ bottom: 30, left: "12%", fontSize: 150 }} light=".28" dark=".12" />
        <Carousel bp="t" />
      </div>
      <div
        className={cn(s.m, s.pad)}
        style={
          { position: "relative", "--pad-l": "16px 16px 56px", "--pad-d": "56px 16px" } as Vars
        }
      >
        <div className={s.lightOnly}>
          <Quote mark="”" style={{ top: 70, right: "8%", fontSize: 140 }} light=".35" dark=".16" />
        </div>
        <Carousel bp="m" />
      </div>
    </section>
  );
}

function Quote({
  mark,
  style,
  light,
  dark,
}: {
  mark: string;
  style: CSSProperties;
  light: string;
  dark: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={s.fg}
      style={
        {
          position: "absolute",
          zIndex: -1,
          lineHeight: 1,
          fontWeight: 800,
          fontFamily: "Georgia, serif",
          "--fg-l": `rgba(126,232,199,${light})`,
          "--fg-d": `rgba(126,232,199,${dark})`,
          ...style,
        } as Vars
      }
    >
      {mark}
    </div>
  );
}

const CFG = {
  d: {
    gap: 16,
    r: 28,
    pad: "30px 32px",
    fGap: 14,
    minH: 200,
    star: 20,
    starGap: 4,
    q: 18,
    ql: 32,
    av: 44,
    name: 15,
    dot: { on: 28, off: 10, gap: 8 },
  },
  t: {
    gap: 14,
    r: 26,
    pad: "26px 28px",
    fGap: 12,
    minH: 190,
    star: 20,
    starGap: 4,
    q: 17,
    ql: 30,
    av: 42,
    name: 15,
    dot: { on: 28, off: 10, gap: 8 },
  },
  m: {
    gap: 14,
    r: 24,
    pad: "22px 20px",
    fGap: 12,
    minH: 0,
    star: 18,
    starGap: 3,
    q: 15,
    ql: 26,
    av: 38,
    name: 14,
    dot: { on: 24, off: 8, gap: 6 },
  },
} as const;

function Carousel({ bp, headId }: { bp: Bp; headId?: string }) {
  const c = CFG[bp];
  const [rev, setRev] = useState(0);
  const r = REVIEWS[rev % REVIEWS.length]!;
  const prev = () => setRev((v) => (v - 1 + REVIEWS.length) % REVIEWS.length);
  const next = () => setRev((v) => (v + 1) % REVIEWS.length);
  const arrowIcon = bp === "m" ? 18 : 20;

  const prevBtn = (
    <button type="button" className={cn(s.btn, s.arrow)} aria-label="الرأي السابق" onClick={prev}>
      <Icon name="chevronEnd" size={arrowIcon} stroke={2.2} />
    </button>
  );
  const nextBtn = (
    <button type="button" className={cn(s.btn, s.arrow)} aria-label="الرأي التالي" onClick={next}>
      <Icon name="chevronStart" size={arrowIcon} stroke={2.2} />
    </button>
  );
  const dots = (
    <div style={{ display: "flex", justifyContent: "center", gap: c.dot.gap }}>
      {REVIEWS.map((_, k) => {
        const on = k === rev;
        return (
          <button
            key={k}
            type="button"
            aria-label={`رأي ${k + 1}`}
            aria-current={on}
            className={s.dot}
            style={{ width: on ? c.dot.on : c.dot.off, height: bp === "m" ? 8 : 10 }}
            onClick={() => setRev(k)}
          />
        );
      })}
    </div>
  );

  const figure = (
    <figure
      aria-live="polite"
      className={cn(s.glLight, s.reviewCard)}
      style={{
        position: "relative",
        flexGrow: 1,
        margin: 0,
        borderRadius: c.r,
        padding: c.pad,
        display: "flex",
        flexDirection: "column",
        gap: c.fGap,
        minHeight: c.minH || undefined,
      }}
    >
      <div
        aria-label="التقييم: بانتظار رأي حقيقي"
        className={s.fg}
        style={
          { display: "flex", gap: c.starGap, "--fg-l": "#005c58", "--fg-d": "#7ee8c7" } as Vars
        }
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" size={c.star} />
        ))}
      </div>
      <blockquote className={s.muted} style={{ margin: 0, fontSize: c.q, lineHeight: `${c.ql}px` }}>
        {r.q}
      </blockquote>
      {bp === "m" ? (
        <span
          aria-hidden="true"
          className={s.darkOnly}
          style={{
            position: "absolute",
            top: 4,
            left: 18,
            fontSize: 70,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            color: "rgba(126,232,199,0.22)",
          }}
        >
          ”
        </span>
      ) : null}
      <figcaption
        className={bp === "m" ? s.capDark : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <span aria-hidden="true" className={s.reviewAvatar} style={{ width: c.av, height: c.av }} />
        <strong className={s.muted} style={{ fontSize: c.name }}>
          {r.n}
        </strong>
      </figcaption>
    </figure>
  );

  return (
    <>
      <SectionHead
        bp={bp}
        id={headId}
        pill="آراء عملائنا"
        title={
          <>
            ماذا يقول <NeonDark>عملاؤنا؟</NeonDark>
          </>
        }
        lead={bp === "m" ? undefined : "ثقة عملائنا هي أكبر دليل على جودة منتجاتنا"}
        className={bp === "t" ? s.mb : undefined}
        style={
          bp === "t"
            ? ({ "--mb-l": "24px", "--mb-d": "28px" } as Vars)
            : bp === "m"
              ? { marginBottom: 20 }
              : undefined
        }
      />
      {bp === "m" ? (
        <>
          {figure}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginTop: 14,
            }}
          >
            {prevBtn}
            {dots}
            {nextBtn}
          </div>
        </>
      ) : (
        <>
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: c.gap }}>
            {prevBtn}
            {figure}
            {nextBtn}
          </div>
          <div style={{ marginTop: bp === "t" ? 16 : 0 }}>{dots}</div>
          {bp === "d" ? (
            <p className={s.muted} style={{ margin: 0, textAlign: "center", fontSize: 13 }}>
              مكان مخصص لآراء عملاء حقيقية — تُضاف بموافقة أصحابها ولا تُكتب نيابة عنهم.
            </p>
          ) : null}
          {bp === "t" ? (
            <p
              className={s.darkOnly}
              style={{
                margin: "14px 0 0",
                textAlign: "center",
                fontSize: 13,
                color: "rgba(242,251,248,0.6)",
              }}
            >
              مكان مخصص لآراء عملاء حقيقية — تُضاف بموافقة أصحابها.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
