"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { GALLERY_CHIPS, GALLERY_ITEMS, type GalleryCategory } from "./data";
import s from "./home.module.css";
import { Icon } from "./Icon";
import { Glow, NeonDark, SectionHead, type Bp, type Vars } from "./parts";

/** «معرض الأعمال» with category chips and a stepping slider (design: gallery section). */
export function Gallery() {
  return (
    <section
      id="gallery"
      aria-labelledby="gal-h"
      className={cn(s.section, s.bg, s.reveal)}
      style={{ "--bg-l": "transparent", "--bg-d": "#001412" } as Vars}
    >
      <div
        className={cn(s.d, s.pad)}
        style={
          { position: "relative", "--pad-l": "40px 24px 80px", "--pad-d": "72px 24px 80px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 50% 60%, rgba(126,232,199,0.28) 0, rgba(126,232,199,0) 40%)"
          dark="radial-gradient(ellipse 50% 50% at 50% 60%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          <Slider bp="d" headId="gal-h" />
        </div>
      </div>
      <div
        className={cn(s.t, s.pad)}
        style={
          { position: "relative", "--pad-l": "32px 24px 72px", "--pad-d": "72px 24px" } as Vars
        }
      >
        <Glow
          light="radial-gradient(circle at 50% 60%, rgba(126,232,199,0.28) 0, rgba(126,232,199,0) 45%)"
          dark="radial-gradient(ellipse 60% 50% at 50% 60%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <Slider bp="t" />
      </div>
      <div
        className={cn(s.m, s.pad)}
        style={{ position: "relative", "--pad-l": "24px 0 56px", "--pad-d": "56px 0" } as Vars}
      >
        <Glow
          light="radial-gradient(circle at 50% 60%, rgba(126,232,199,0.28) 0, rgba(126,232,199,0) 55%)"
          dark="radial-gradient(ellipse 80% 50% at 50% 60%, rgba(5,64,57,0.5) 0%, rgba(5,64,57,0) 100%)"
        />
        <Slider bp="m" />
      </div>
    </section>
  );
}

const CFG = {
  d: {
    show: 4,
    page: 2,
    rowGap: 16,
    gridGap: 16,
    h: 260,
    r: 24,
    pad: 6,
    ir: 19,
    tag: { b: 14, p: "2px 10px", f: 11 },
    dot: { on: 28, off: 10, h: 10, gap: 8 },
    arrowIcon: 24,
  },
  t: {
    show: 3,
    page: 3,
    rowGap: 12,
    gridGap: 14,
    h: 230,
    r: 22,
    pad: 6,
    ir: 17,
    tag: { b: 14, p: "2px 10px", f: 11 },
    dot: { on: 28, off: 10, h: 10, gap: 8 },
    arrowIcon: 24,
  },
  m: {
    show: 2,
    page: 2,
    rowGap: 8,
    gridGap: 10,
    h: 190,
    r: 20,
    pad: 5,
    ir: 16,
    tag: { b: 12, p: "1px 8px", f: 10 },
    dot: { on: 24, off: 8, h: 8, gap: 6 },
    arrowIcon: 20,
  },
} as const;

function Slider({ bp, headId }: { bp: Bp; headId?: string }) {
  const c = CFG[bp];
  const [cat, setCat] = useState<GalleryCategory>("all");
  const [start, setStart] = useState(0);

  const images = GALLERY_ITEMS.filter((x) => cat === "all" || x.cat === cat);
  const n = images.length;
  const first = n ? start % n : 0;
  const visible = Array.from({ length: Math.min(c.show, n) }, (_, i) => images[(first + i) % n]!);
  const pages = Math.max(1, Math.ceil(n / c.page));
  const page = n ? Math.floor(first / c.page) % pages : 0;

  const head = (
    <SectionHead
      bp={bp}
      id={headId}
      pill="معرض الأعمال"
      title={
        <>
          تصاميم حقيقية <NeonDark>لعملائنا</NeonDark>
        </>
      }
      lead={
        bp === "m"
          ? "الصور الحالية نماذج عرض لحين إضافة أعمال العملاء بموافقتهم"
          : "الصور الحالية نماذج عرض لحين إضافة صور أعمال العملاء بموافقتهم"
      }
      leadStyle={
        bp === "m"
          ? { fontSize: 12, lineHeight: "20px", fontWeight: 600 }
          : { fontSize: 13, lineHeight: "22px", fontWeight: 600 }
      }
      style={
        bp === "t"
          ? { marginBottom: 22 }
          : bp === "m"
            ? { marginBottom: 18, padding: "0 16px" }
            : undefined
      }
    />
  );

  const chips = (
    <div
      role="group"
      aria-label="تصفية المعرض"
      className={bp === "m" ? s.strip : undefined}
      style={
        bp === "m"
          ? { display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px 14px" }
          : {
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              marginBottom: bp === "t" ? 22 : 0,
            }
      }
    >
      {GALLERY_CHIPS.map((chip) => {
        const on = cat === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={on}
            className={cn(s.chip, on ? s.chipOn : s.chipOff)}
            onClick={() => {
              setCat(chip.key);
              setStart(0);
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {head}
      {chips}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: c.rowGap,
          padding: bp === "m" ? "0 12px" : undefined,
        }}
      >
        <button
          type="button"
          className={cn(s.btn, s.round)}
          aria-label="الصور السابقة"
          onClick={() => n && setStart((first - 1 + n) % n)}
        >
          <Icon name="arrowEnd" size={c.arrowIcon} stroke={2.2} />
        </button>
        <ul
          aria-live="polite"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            flexGrow: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${c.show}, minmax(0, 1fr))`,
            gap: c.gridGap,
          }}
        >
          {visible.map((g, i) => (
            <li
              key={`${g.img}-${i}`}
              className={cn(s.galItem, s.glLight)}
              style={{
                position: "relative",
                height: c.h,
                borderRadius: c.r,
                overflow: "hidden",
                padding: c.pad,
              }}
            >
              <div
                className={s.bg}
                style={
                  {
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: c.ir,
                    overflow: "hidden",
                    "--bg-l": "transparent",
                    "--bg-d": "#032722",
                  } as Vars
                }
              >
                <Image
                  src={g.img}
                  alt={g.alt}
                  fill
                  sizes="(min-width: 1100px) 290px, (min-width: 700px) 240px, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <span
                className={s.demoTag}
                style={{ bottom: c.tag.b, right: c.tag.b, padding: c.tag.p, fontSize: c.tag.f }}
              >
                نموذج عرض
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(s.btn, s.round)}
          aria-label="الصور التالية"
          onClick={() => n && setStart((first + 1) % n)}
        >
          <Icon name="arrowStart" size={c.arrowIcon} stroke={2.2} />
        </button>
      </div>
      {n === 0 ? (
        <p className={s.muted} style={{ margin: 0, textAlign: "center", fontSize: 15 }}>
          لسه مفيش أعمال منشورة في القسم ده.
        </p>
      ) : null}
      <div
        role="group"
        aria-label="صفحات المعرض"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: c.dot.gap,
          marginTop: bp === "t" ? 18 : bp === "m" ? 16 : 0,
        }}
      >
        {Array.from({ length: Math.min(pages, 4) }, (_, j) => {
          const on = j === page;
          return (
            <button
              key={j}
              type="button"
              aria-label={`صفحة ${j + 1}`}
              aria-current={on}
              className={s.dot}
              style={{ width: on ? c.dot.on : c.dot.off, height: c.dot.h }}
              onClick={() => setStart(j * c.page)}
            />
          );
        })}
      </div>
    </>
  );
}
