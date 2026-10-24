"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, Switch, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import c from "./content.module.css";

/**
 * Contact & content (brief B8, B11), from docs/design/Admin-Content.html: contact details, home
 * hero texts, WhatsApp templates and real customer reviews (consent only, never invented).
 * Demo values with `[للتأكيد]`-style placeholders for open decisions, as in the design.
 */

type Tab = "contact" | "hero" | "wa" | "reviews";
type Tpl = "approve" | "info" | "reject" | "ready";
type ContactKey = "wa" | "ig" | "fb" | "tt" | "email" | "addr" | "hours";
type HeroKey = "pill" | "t1" | "t2" | "sub" | "cta";
type Review = { name: string; text: string; pub: boolean };

const IC = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  ig: "M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01",
  fb: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  tt: "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
  pin: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  home: "M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

const CONTACT_FIELDS: [ContactKey, string, string, "ltr" | "rtl"][] = [
  ["wa", "رقم واتساب", IC.phone, "ltr"],
  ["ig", "إنستغرام", IC.ig, "ltr"],
  ["fb", "فيسبوك", IC.fb, "rtl"],
  ["tt", "تيك توك", IC.tt, "rtl"],
  ["email", "البريد الإلكتروني", IC.mail, "rtl"],
  ["addr", "العنوان", IC.pin, "rtl"],
  ["hours", "مواعيد العمل", P.clock, "rtl"],
];

const TEMPLATES: [Tpl, string, string][] = [
  ["approve", "الموافقة على الطلب", "تُرسل عند الموافقة على طلب"],
  ["info", "طلب بيانات ناقصة", "عندما تحتاج إلى شيء من العميل"],
  ["reject", "رفض الطلب", "عندما يتعذّر تنفيذ الطلب"],
  ["ready", "الطلب جاهز", "عندما يكتمل الطلب"],
];

const VARS: Record<Tpl, string[]> = {
  approve: ["{الاسم}", "{رقم_الطلب}", "{رابط_التتبع}", "{السعر_والموعد}"],
  info: ["{الاسم}", "{رقم_الطلب}", "{المطلوب}", "{رابط_التتبع}"],
  reject: ["{الاسم}", "{رقم_الطلب}", "{السبب}"],
  ready: ["{الاسم}", "{رقم_الطلب}", "{رابط_التتبع}"],
};

/** Sample customer used for the live preview. */
const SAMPLE: Record<string, string> = {
  "{الاسم}": "محمد",
  "{رقم_الطلب}": "YZ-8K3QF7",
  "{رابط_التتبع}": "[رابط الموقع]/track?order=YZ-8K3QF7",
  "{السعر_والموعد}": "السعر: [السعر] · الاستلام: [التاريخ]",
  "{المطلوب}": "نسخة من التصميم بدقة أعلى",
  "{السبب}": "الكمية أقل من الحد الأدنى",
};

export function ContentBoard() {
  const [tab, setTab] = useState<Tab>("wa");
  const [dirty, setDirty] = useState(false);
  const [contact, setContact] = useState<Record<ContactKey, string>>({
    wa: "01116891025",
    ig: "youzersef",
    fb: "يوزرسيف",
    tt: "يوزرسيف",
    email: "[البريد الإلكتروني — بانتظار التأكيد]",
    addr: "أسوان، مصر [العنوان التفصيلي بانتظار التأكيد]",
    hours: "[مواعيد العمل — بانتظار التأكيد]",
  });
  const [hero, setHero] = useState<Record<HeroKey, string>>({
    pill: "مطبوعات مميزة",
    t1: "مطبوعات",
    t2: "تحكي قصتك",
    sub: "تيشيرتات، هوديز، قبعات، أكواب، ملصقات، هدايا والمزيد بتصميماتك الخاصة وبأعلى جودة.",
    cta: "ابدأ طلبك الآن",
  });
  const [tpl, setTplKey] = useState<Tpl>("approve");
  const [tpls, setTpls] = useState<Record<Tpl, string>>({
    approve:
      "مرحبًا {الاسم}،\nتم قبول طلبك رقم {رقم_الطلب} من يوزرسيف.\n{السعر_والموعد}\nيمكنك متابعة حالة طلبك من هذا الرابط:\n{رابط_التتبع}\nستحتاج إلى رقم الطلب ورقم هاتفك لفتح الصفحة.",
    info: "مرحبًا {الاسم}،\nبخصوص طلبك رقم {رقم_الطلب}: نحتاج منك {المطلوب} لاستكمال المراجعة.\nيمكنك متابعة الطلب من هنا: {رابط_التتبع}",
    reject:
      "مرحبًا {الاسم}،\nنعتذر، لن نتمكن من تنفيذ طلبك رقم {رقم_الطلب} بشكله الحالي.\nالسبب: {السبب}\nإذا رغبت في تعديل الطلب معًا، فتواصل معنا على هذا الرقم.",
    ready:
      "مرحبًا {الاسم}،\nطلبك رقم {رقم_الطلب} جاهز!\nيمكنك استلامه من المتجر في أسوان [المواعيد بانتظار التأكيد].\nتفاصيل الطلب: {رابط_التتبع}",
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const { toast, flash, hide } = useFlash();

  const touch =
    <T,>(set: (fn: (v: T) => T) => void) =>
    (fn: (v: T) => T) => {
      set(fn);
      setDirty(true);
    };
  const setContactF = touch(setContact);
  const setHeroF = touch(setHero);
  const setTplsF = touch(setTpls);

  const tabs: [Tab, string, string][] = [
    ["contact", "بيانات التواصل", IC.phone],
    ["hero", "نصوص الرئيسية", IC.home],
    ["wa", "رسائل واتساب", P.chat],
    ["reviews", "آراء العملاء", IC.star],
  ];

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader
        title="التواصل والمحتوى"
        subtitle="بيانات التواصل، نصوص الصفحة الرئيسية، رسائل واتساب الجاهزة وآراء العملاء"
      >
        {dirty ? <span className={cn(k.badge, k.bWarn)}>توجد تغييرات غير محفوظة</span> : null}
        <button
          className={cn(k.btn, k.cta)}
          type="button"
          onClick={() => {
            setDirty(false);
            flash("حُفظت التغييرات وستظهر في الموقع");
          }}
          disabled={!dirty}
          style={{ minHeight: 46, padding: "8px 22px", borderRadius: 999, fontSize: 15 }}
        >
          <Ic d={P.ok} size={18} stroke={2.2} />
          حفظ التغييرات
        </button>
      </KitHeader>

      <div
        className={cn(k.card, s.up, s.d1)}
        role="tablist"
        aria-label="أقسام المحتوى"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: 6,
          borderRadius: 999,
          alignSelf: "flex-start",
        }}
      >
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            className={c.tab}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            <Ic d={icon} size={18} />
            {label}
          </button>
        ))}
      </div>

      {tab === "contact" ? (
        <TwoCol>
          <section
            className={k.card}
            aria-labelledby="ct-h"
            style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h2 id="ct-h" className={k.h2}>
              بيانات التواصل
            </h2>
            {CONTACT_FIELDS.map(([key, label, icon, dir]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className={k.lbl} htmlFor={`c-${key}`}>
                  {label}
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Ic
                    d={icon}
                    size={18}
                    style={{ position: "absolute", right: 14, color: "var(--accent-ink)" }}
                  />
                  <input
                    className={k.fld}
                    id={`c-${key}`}
                    type="text"
                    dir={dir}
                    value={contact[key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setContactF((o) => ({ ...o, [key]: v }));
                    }}
                    style={{ paddingRight: 42, textAlign: "right" }}
                  />
                </div>
              </div>
            ))}
            <p className={k.muted} style={{ margin: 0, fontSize: 12, lineHeight: "20px" }}>
              أي قيمة بين [ ] تعني أنها ما زالت بانتظار التأكيد، ولن تظهر للعملاء بهذا الشكل.
            </p>
          </section>
          <Preview id="ctp-h" title="معاينة الفوتر في الموقع">
            <div
              className={c.prev}
              style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  zIndex: -1,
                  inset: 0,
                  background:
                    "radial-gradient(ellipse 80% 80% at 80% 0%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)",
                }}
              />
              <Ornament
                style={{ bottom: -120, left: -120, width: 280, height: 280, opacity: 0.45 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Image
                  width={44}
                  height={44}
                  src="/brand/logo.jpg"
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: 12 }}
                />
                <strong className={s.neon} style={{ fontSize: 16 }}>
                  تواصل معنا
                </strong>
              </div>
              {CONTACT_FIELDS.map(([key, , icon, dir]) => (
                <span
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <Ic d={icon} size={18} style={{ color: "#7ee8c7" }} />
                  <span dir={dir}>{contact[key]}</span>
                </span>
              ))}
            </div>
          </Preview>
        </TwoCol>
      ) : null}

      {tab === "hero" ? (
        <TwoCol>
          <section
            className={k.card}
            aria-labelledby="hr-h"
            style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h2 id="hr-h" className={k.h2}>
              نصوص أعلى الصفحة الرئيسية
            </h2>
            {(
              [
                ["pill", "الشارة الصغيرة"],
                ["t1", "العنوان — السطر الأول"],
                ["t2", "العنوان — السطر المضيء"],
                ["sub", "الوصف"],
                ["cta", "نص الزر"],
              ] as [HeroKey, string][]
            ).map(([key, label]) => {
              const onChange = (e: { target: { value: string } }) => {
                const v = e.target.value;
                setHeroF((o) => ({ ...o, [key]: v }));
              };
              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className={k.lbl} htmlFor={`h-${key}`}>
                    {label}
                  </label>
                  {key === "sub" ? (
                    <>
                      <textarea
                        className={k.fld}
                        id="h-sub"
                        rows={3}
                        value={hero.sub}
                        onChange={onChange}
                        style={{ lineHeight: "24px" }}
                      />
                      <span className={k.muted} style={{ fontSize: 12 }}>
                        {hero.sub.length} حرفًا — يُفضّل أقل من 120
                      </span>
                    </>
                  ) : (
                    <input
                      className={k.fld}
                      id={`h-${key}`}
                      type="text"
                      value={hero[key]}
                      onChange={onChange}
                    />
                  )}
                </div>
              );
            })}
          </section>
          <Preview id="hrp-h" title="معاينة مباشرة">
            <div
              className={c.prev}
              style={{
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 12,
                minHeight: 300,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  zIndex: -1,
                  inset: 0,
                  background:
                    "radial-gradient(ellipse 70% 80% at 80% 30%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)",
                }}
              />
              <Ornament style={{ top: -80, left: -140, width: 340, height: 340, opacity: 0.5 }} />
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 14px",
                  borderRadius: 999,
                  background: "rgba(126,232,199,0.12)",
                  border: "1px solid rgba(126,232,199,0.5)",
                  color: "#b8f2de",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {hero.pill}
              </span>
              <strong style={{ fontSize: 38, lineHeight: "52px", fontWeight: 800 }}>
                {hero.t1}
                <br />
                <span className={s.neon}>{hero.t2}</span>
              </strong>
              <p
                style={{
                  margin: 0,
                  maxWidth: 360,
                  fontSize: 14,
                  lineHeight: "24px",
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {hero.sub}
              </p>
              <span
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 46,
                  padding: "8px 24px",
                  borderRadius: 999,
                  background: "linear-gradient(180deg,rgba(0,120,112,.6),rgba(0,43,40,.6))",
                  border: "1.5px solid rgba(126,232,199,.8)",
                  boxShadow: "0 0 18px rgba(126,232,199,.45)",
                  fontWeight: 800,
                }}
              >
                {hero.cta}
              </span>
            </div>
          </Preview>
        </TwoCol>
      ) : null}

      {tab === "wa" ? (
        <WaTemplates
          tpl={tpl}
          setTpl={setTplKey}
          body={tpls[tpl]}
          setBody={(v) => setTplsF((t) => ({ ...t, [tpl]: v }))}
        />
      ) : null}

      {tab === "reviews" ? (
        <Reviews
          reviews={reviews}
          onAdd={(r) => {
            setReviews((all) => [{ ...r, pub: false }, ...all]);
            setDirty(true);
            flash("أُضيف الرأي مخفيًا — فعّله عندما تريد إظهاره");
          }}
          onToggle={(i) => {
            setReviews((all) => all.map((r, j) => (j === i ? { ...r, pub: !r.pub } : r)));
            setDirty(true);
          }}
        />
      ) : null}

      <KitToast text={toast} onClose={hide} />
    </div>
  );
}

function TwoCol({ children }: { children: ReactNode }) {
  return (
    <div
      className={c.fade}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: 16,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

function Preview({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 16 }}
    >
      <h2 id={id} className={k.h2} style={{ fontSize: 15 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Ornament({ style }: { style: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets
    <img
      src="/brand/ornament-mint.svg"
      alt=""
      aria-hidden="true"
      className={s.ornament}
      style={{ position: "absolute", zIndex: -1, ...style }}
    />
  );
}

function WaTemplates({
  tpl,
  setTpl,
  body,
  setBody,
}: {
  tpl: Tpl;
  setTpl: (t: Tpl) => void;
  body: string;
  setBody: (v: string) => void;
}) {
  const cur = TEMPLATES.find(([key]) => key === tpl) ?? TEMPLATES[0]!;
  let preview = body;
  for (const [key, v] of Object.entries(SAMPLE)) preview = preview.split(key).join(v);
  return (
    <div
      className={cn(c.fade, k.stackM)}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)",
        gap: 16,
        alignItems: "start",
      }}
    >
      <section
        className={k.card}
        aria-label="الرسائل"
        style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {TEMPLATES.map(([key, name, when]) => {
          const on = tpl === key;
          return (
            <button
              key={key}
              className={k.btn}
              type="button"
              aria-pressed={on}
              onClick={() => setTpl(key)}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: 10,
                minHeight: 56,
                padding: "8px 12px",
                borderRadius: 16,
                border: `1px solid ${on ? "rgba(126,232,199,0.7)" : "transparent"}`,
                color: on ? "#ffffff" : "var(--ink)",
                background: on ? "var(--chip-on-bg)" : "transparent",
                ...(on ? { boxShadow: "0 0 14px rgba(126,232,199,0.35)" } : null),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: 999,
                  background: on ? "#7ee8c7" : "var(--field-bd)",
                  ...(on ? { boxShadow: "0 0 8px rgba(126,232,199,0.9)" } : null),
                }}
              />
              <span
                style={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "right",
                }}
              >
                <span style={{ fontSize: 14 }}>{name}</span>
                <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>{when}</span>
              </span>
            </button>
          );
        })}
      </section>
      <section
        className={k.card}
        aria-labelledby="tp-h"
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="tp-h" className={k.h2}>
            {cur[1]}
          </h2>
          <span className={k.muted} style={{ fontSize: 12 }}>
            {cur[2]}
          </span>
          <label className={k.lbl} htmlFor="tp-body">
            نص الرسالة
          </label>
          <textarea
            className={k.fld}
            id="tp-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ lineHeight: "26px" }}
          />
          <span className={k.lbl}>أضف متغيّرًا (يُستبدل تلقائيًا لكل عميل)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {VARS[tpl].map((v) => (
              <button
                key={v}
                className={cn(c.var, k.btn)}
                type="button"
                onClick={() => setBody(`${body} ${v}`)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span
            className={k.lbl}
            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-ink)" }}
          >
            <Ic d={P.chat} size={18} />
            معاينة بعميل تجريبي
          </span>
          <div
            className={k.tint}
            style={{
              padding: 16,
              borderRadius: 22,
              minHeight: 240,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div className={c.bubble}>
              {preview}
              <span
                aria-hidden="true"
                style={{ position: "absolute", bottom: 5, left: 12, fontSize: 11, opacity: 0.6 }}
              >
                10:24 ✓✓
              </span>
            </div>
          </div>
          <p className={k.muted} style={{ margin: 0, fontSize: 12, lineHeight: "20px" }}>
            تُرسل هذه الرسالة من شاشة الطلبات عند اتخاذ القرار. يتطلب الإرسال التلقائي إلى رقم
            العميل ربط واتساب للأعمال [بانتظار الربط].
          </p>
        </div>
      </section>
    </div>
  );
}

function Reviews({
  reviews,
  onAdd,
  onToggle,
}: {
  reviews: Review[];
  onAdd: (r: { name: string; text: string }) => void;
  onToggle: (i: number) => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  return (
    <TwoCol>
      <form
        className={k.card}
        aria-labelledby="rv-h"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || text.trim().length < 5) {
            setErr("اكتب اسم العميل ورأيه.");
            return;
          }
          if (!consent) {
            setErr("يلزم الحصول على موافقة العميل قبل إضافة رأيه.");
            return;
          }
          onAdd({ name: name.trim(), text: text.trim() });
          setName("");
          setText("");
          setConsent(false);
        }}
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 id="rv-h" className={k.h2}>
          إضافة رأي عميل حقيقي
        </h2>
        <p className={k.muted} style={{ margin: 0, fontSize: 13, lineHeight: "22px" }}>
          انقل رأي العميل كما كتبه (من واتساب أو إنستغرام مثلًا). لا يجوز كتابة آراء نيابة عن أحد.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="rv-name">
            اسم العميل (أو الاسم الأول فقط)
          </label>
          <input
            className={k.fld}
            id="rv-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="rv-text">
            الرأي
          </label>
          <textarea
            className={k.fld}
            id="rv-text"
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setErr("");
            }}
            style={{ lineHeight: "24px" }}
          />
        </div>
        <label className={k.chk}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              setErr("");
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
              ...(consent
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
          <span>العميل وافق على نشر رأيه باسمه</span>
        </label>
        {err ? (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "8px 12px",
              borderRadius: 12,
              background: "var(--warn-bg)",
              border: "1px solid var(--warn-bd)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {err}
          </p>
        ) : null}
        <button
          className={cn(k.btn, k.cta)}
          type="submit"
          style={{ minHeight: 48, borderRadius: 999, fontSize: 15 }}
        >
          إضافة الرأي
        </button>
      </form>
      <section
        className={k.card}
        aria-labelledby="rvl-h"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 id="rvl-h" className={k.h2}>
          الآراء المحفوظة
        </h2>
        {reviews.length === 0 ? (
          <div
            className={k.tint}
            style={{
              padding: "28px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              textAlign: "center",
            }}
          >
            <span
              className={k.tile}
              aria-hidden="true"
              style={{ width: 52, height: 52, borderRadius: 999 }}
            >
              <Ic d={P.chat} />
            </span>
            <strong>لا توجد آراء عملاء بعد</strong>
            <span className={k.muted} style={{ fontSize: 13 }}>
              سيبقى قسم الآراء في الموقع بالنص المؤقت حتى تضيف أول رأي حقيقي.
            </span>
          </div>
        ) : null}
        {reviews.map((r, i) => (
          <article
            key={`${r.name}-${i}`}
            className={cn(k.tint, s.pop)}
            style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <p style={{ margin: 0, fontSize: 14, lineHeight: "24px" }}>«{r.text}»</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong style={{ flexGrow: 1, fontSize: 13 }}>{r.name}</strong>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {r.pub ? "ظاهر في الموقع" : "مخفي"}
              </span>
              <Switch on={r.pub} onToggle={() => onToggle(i)} label={`نشر رأي ${r.name}`} />
            </div>
          </article>
        ))}
      </section>
    </TwoCol>
  );
}
