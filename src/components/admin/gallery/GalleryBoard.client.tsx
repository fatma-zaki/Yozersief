"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, Switch, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import g from "./gallery.module.css";

/**
 * Gallery (brief B11), from docs/design/Admin-Gallery.html. Publishing is locked until the
 * customer's consent is ticked (brief A6.8). Demo pictures, as in the design.
 */

type Item = {
  id: number;
  img: string;
  cat: string;
  caption: string;
  consent: boolean;
  pub: boolean;
};
type Filter = "all" | "pub" | "hidden" | "pending";

const DEMO: Item[] = [
  {
    id: 1,
    img: "/images/home/hoodie.jpg",
    cat: "هوديز",
    caption: "هوديز دفعة",
    consent: true,
    pub: true,
  },
  {
    id: 2,
    img: "/images/home/mug-bottle.jpg",
    cat: "مجات",
    caption: "مجات هدايا",
    consent: true,
    pub: true,
  },
  {
    id: 3,
    img: "/images/home/cap.jpg",
    cat: "كابات",
    caption: "كابات بلوجو",
    consent: true,
    pub: true,
  },
  {
    id: 4,
    img: "/images/home/phone-cases.jpg",
    cat: "كفرات",
    caption: "كفرات بصور",
    consent: false,
    pub: false,
  },
  {
    id: 5,
    img: "/images/home/tshirt.jpg",
    cat: "تيشيرتات",
    caption: "تيشيرتات فريق",
    consent: true,
    pub: false,
  },
  {
    id: 6,
    img: "/images/home/sticker.jpg",
    cat: "استيكرات",
    caption: "",
    consent: false,
    pub: false,
  },
  {
    id: 7,
    img: "/images/home/heat-press.jpg",
    cat: "طباعة حرارية",
    caption: "طباعة حرارية",
    consent: true,
    pub: true,
  },
];
const DEMO_UPLOADS = [
  "/images/home/tshirt.jpg",
  "/images/home/shop-sign.jpg",
  "/images/home/mug-bottle.jpg",
];

const state = (x: Item): Exclude<Filter, "all"> =>
  x.pub ? "pub" : x.consent ? "hidden" : "pending";

export function GalleryBoard() {
  const [items, setItems] = useState(DEMO);
  const [filter, setFilter] = useState<Filter>("all");
  const [del, setDel] = useState<number | null>(null);
  const nextId = useRef(100);
  const { toast, flash, hide } = useFlash();

  const upd = (id: number, patch: Partial<Item>) =>
    setItems((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addOne = (img: string) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((all) => [{ id, img, cat: "جديدة", caption: "", consent: false, pub: false }, ...all]);
  };

  const pubN = items.filter((x) => x.pub).length;
  const pendN = items.filter((x) => !x.consent).length;
  const list = items.filter((x) => filter === "all" || state(x) === filter);
  const filters: [Filter, string][] = [
    ["all", `الكل · ${items.length}`],
    ["pub", "منشورة"],
    ["hidden", "مخفية"],
    ["pending", "بانتظار الموافقة"],
  ];
  const stats = [
    { n: pubN, label: "منشورة في الموقع", icon: P.eye },
    { n: items.length - pubN - pendN, label: "مخفية", icon: P.eyeOff },
    { n: pendN, label: "بانتظار موافقة العميل", icon: P.shield },
  ];

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader title="أعمالنا" subtitle="الصور اللي بتظهر في معرض الأعمال على الموقع">
        <div role="group" aria-label="فلتر" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {filters.map(([key, label]) => (
            <button
              key={key}
              className={cn(k.btn, k.chip, filter === key ? k.chipOn : k.chipOff)}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </KitHeader>

      <p
        className={cn(s.up, s.d1)}
        role="note"
        style={{
          margin: 0,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 18,
          background: "var(--warn-bg)",
          border: "1px solid var(--warn-bd)",
          color: "var(--ink)",
          fontSize: 13,
          lineHeight: "22px",
        }}
      >
        <Ic d={P.shieldCheck} size={20} style={{ color: "var(--warn-ink)" }} />
        <span>
          <strong>قاعدة النشر:</strong> مفيش صورة لشغل عميل تتنشر غير بموافقته. زرار النشر بيتقفل
          لحد ما تتعلّم «موافقة العميل». الصور الحالية نماذج عرض.
        </span>
      </p>

      <section
        className={cn(s.up, s.d2)}
        aria-label="ملخص"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        {stats.map((t) => (
          <div
            key={t.label}
            className={cn(k.card, k.lift)}
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderRadius: 22,
            }}
          >
            <span className={k.tile} aria-hidden="true" style={{ width: 44, height: 44 }}>
              <Ic d={t.icon} />
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <strong className={k.strong} style={{ fontSize: 26, lineHeight: "34px" }}>
                {t.n}
              </strong>
              <span className={k.muted} style={{ fontSize: 13, fontWeight: 700 }}>
                {t.label}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section
        className={cn(s.up, s.d3)}
        aria-label="الصور"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 16,
        }}
      >
        <div
          className={k.card}
          style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label
            className={g.drop}
            style={{
              flexGrow: 1,
              minHeight: 190,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 16,
              borderRadius: 20,
              border: "1.5px dashed var(--field-bd)",
              background: "var(--tint)",
              textAlign: "center",
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) if (/^image\//.test(f.type)) addOne(URL.createObjectURL(f));
                e.target.value = "";
                if (files.length) flash(`اتضافت ${files.length} صورة كمخفية`);
              }}
            />
            <span
              className={k.tile}
              aria-hidden="true"
              style={{ width: 52, height: 52, borderRadius: 999 }}
            >
              <Ic d={P.upload} />
            </span>
            <strong className={k.strong} style={{ fontSize: 15 }}>
              ارفع صور جديدة
            </strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              JPG أو PNG — هتتضاف مخفية لحد ما تنشرها
            </span>
          </label>
          <button
            className={cn(k.btn, k.soft)}
            type="button"
            onClick={() => {
              addOne(DEMO_UPLOADS[(nextId.current + 1) % DEMO_UPLOADS.length] ?? "");
              flash("اتضافت صورة جديدة كمخفية لحد الموافقة");
            }}
            style={{ minHeight: 40, borderRadius: 999, fontSize: 13 }}
          >
            أضف صورة تجريبية
          </button>
        </div>
        {list.map((x) => {
          const st = state(x);
          return (
            <article key={x.id} className={cn(k.card, g.gcard, k.lift, !x.pub && g.hidden)}>
              <div className={g.gimg}>
                <Image
                  src={x.img}
                  alt={x.caption || x.cat}
                  fill
                  sizes="(max-width: 700px) 100vw, 320px"
                  unoptimized={x.img.startsWith("blob:")}
                />
                <span
                  className={cn(k.badge, k.bGlass, g.glass)}
                  style={{ position: "absolute", top: 10, right: 10 }}
                >
                  {x.cat}
                </span>
                <span
                  className={cn(
                    k.badge,
                    st === "pub" ? k.bOk : st === "pending" ? k.bWarn : k.bOff,
                  )}
                  style={{ position: "absolute", top: 10, left: 10 }}
                >
                  {st === "pub" ? "منشورة" : st === "pending" ? "بانتظار موافقة العميل" : "مخفية"}
                </span>
                <span
                  className={cn(k.badge, k.bGlass, g.glass)}
                  style={{ position: "absolute", bottom: 10, right: 10 }}
                >
                  نموذج عرض
                </span>
              </div>
              <div
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <input
                  className={cn(k.fld, g.fld)}
                  type="text"
                  value={x.caption}
                  onChange={(e) => upd(x.id, { caption: e.target.value })}
                  aria-label={`وصف صورة ${x.cat}`}
                  placeholder="وصف قصير يظهر تحت الصورة"
                />
                <label className={k.chk}>
                  <input
                    type="checkbox"
                    checked={x.consent}
                    onChange={(e) => {
                      const c = e.target.checked;
                      upd(x.id, { consent: c, pub: c ? x.pub : false });
                      if (!c && x.pub) flash(`اتشالت صورة «${x.cat}» من الموقع لأن الموافقة اتلغت`);
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...(x.consent
                        ? {
                            background: "linear-gradient(180deg,#00a08f,#00706a)",
                            color: "#fff",
                            boxShadow: "0 0 8px rgba(126,232,199,0.6)",
                          }
                        : {
                            background: "transparent",
                            color: "transparent",
                            border: "1.5px solid var(--field-bd)",
                          }),
                    }}
                  >
                    <Ic d={P.ok} size={13} stroke={3} />
                  </span>
                  <span>معايا موافقة العميل على النشر</span>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 8,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Switch
                    on={x.pub}
                    disabled={!x.consent}
                    label={`نشر صورة ${x.cat}`}
                    onToggle={() => {
                      if (!x.consent) return;
                      upd(x.id, { pub: !x.pub });
                      flash(x.pub ? "اتخفت الصورة من المعرض" : "اتنشرت الصورة في معرض الأعمال");
                    }}
                  />
                  <span style={{ flexGrow: 1, fontSize: 13, fontWeight: 700 }}>
                    {x.pub ? "منشورة في الموقع" : x.consent ? "مخفية" : "محتاجة موافقة الأول"}
                  </span>
                  <button
                    className={cn(k.btn, k.line)}
                    type="button"
                    onClick={() => setDel(x.id)}
                    aria-label={`مسح صورة ${x.cat}`}
                    style={{ width: 36, height: 36, borderRadius: 999 }}
                  >
                    <Ic d={P.trash} size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {list.length === 0 ? (
        <div className={k.card} style={{ padding: "32px 16px", textAlign: "center" }}>
          <strong>مفيش صور في القسم ده</strong>
        </div>
      ) : null}

      {del !== null ? (
        <ConfirmDelete
          onCancel={() => setDel(null)}
          onDelete={() => {
            setItems((all) => all.filter((x) => x.id !== del));
            setDel(null);
            flash("اتمسحت الصورة");
          }}
        />
      ) : null}
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}

function ConfirmDelete({ onCancel, onDelete }: { onCancel: () => void; onDelete: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className={s.fade}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--overlay)",
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        className={cn(k.card, s.pop)}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-h"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--sheet-bg)",
        }}
      >
        <h2 id="del-h" className={k.h2} style={{ fontSize: 20 }}>
          تمسح الصورة دي؟
        </h2>
        <p className={k.muted} style={{ margin: 0, fontSize: 14, lineHeight: "24px" }}>
          هتختفي من المعرض ومن لوحة الإدارة. مش هتقدر ترجعها.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={cn(k.btn, k.cta)}
            type="button"
            onClick={onDelete}
            style={{ minHeight: 46, padding: "0 22px", borderRadius: 999 }}
          >
            امسح
          </button>
          <button
            ref={cancelRef}
            className={cn(k.btn, k.soft)}
            type="button"
            onClick={onCancel}
            style={{ minHeight: 46, padding: "0 22px", borderRadius: 999 }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
