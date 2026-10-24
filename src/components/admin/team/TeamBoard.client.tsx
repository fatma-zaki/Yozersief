"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import { PENDING, type Kind } from "./data";
import t from "./team.module.css";

/**
 * Team activity (brief B10), from docs/design/Admin-Team.html: decisions waiting for the admin,
 * member cards, the activity feed, alerts and the sensitive-data access log. Demo data with the
 * design's placeholders for staff names; the audit use cases replace it later.
 */

type Range = "today" | "week" | "month";
type Type = "all" | "orders" | "design" | "prod" | "money" | "access";

const MEMBERS = [
  { id: 1, name: "صاحب المحل", role: "مدير", ini: "ي", on: true },
  {
    id: 4,
    name: "[اسم الموظف]",
    role: "استقبال طلبات",
    ini: "م",
    on: true,
    k: {
      today: ["14", "18 د", "متوسط أول رد"],
      week: ["86", "22 د", "متوسط أول رد"],
      month: ["341", "25 د", "متوسط أول رد"],
    },
    last: "نشط دلوقتي",
  },
  {
    id: 2,
    name: "[اسم المصمم]",
    role: "مصمم",
    ini: "ص",
    on: true,
    k: {
      today: ["5", "2", "موكابات اترفعت"],
      week: ["31", "12", "موكابات اترفعت"],
      month: ["118", "47", "موكابات اترفعت"],
    },
    last: "نشط من 10 دقايق",
  },
  {
    id: 5,
    name: "[مسؤول المطبعة]",
    role: "إنتاج",
    ini: "ط",
    on: true,
    k: {
      today: ["22", "96", "قطعة اتطبعت"],
      week: ["140", "610", "قطعة اتطبعت"],
      month: ["520", "2,380", "قطعة اتطبعت"],
    },
    last: "نشط دلوقتي",
  },
  {
    id: 3,
    name: "[مسؤول التسليم]",
    role: "تسليم وتحصيل",
    ini: "ت",
    on: false,
    k: {
      today: ["6", "3", "طلبات اتسلمت"],
      week: ["38", "19", "طلبات اتسلمت"],
      month: ["150", "74", "طلبات اتسلمت"],
    },
    last: "آخر نشاط 1:40 م",
  },
] as const;
type MemberId = (typeof MEMBERS)[number]["id"];
const byId = (id: MemberId) => MEMBERS.find((m) => m.id === id)!;

const TYPES: [Type, string][] = [
  ["all", "الكل"],
  ["orders", "الطلبات"],
  ["design", "الموكابات"],
  ["prod", "الإنتاج"],
  ["money", "التحصيل والتسليم"],
  ["access", "الصلاحيات"],
];

/** [member, type, text, order, time, flag, flag tone] */
const EVENTS: [
  MemberId,
  Exclude<Type, "all">,
  string,
  string,
  string,
  string,
  "warn" | "role" | "off" | "",
][] = [
  [5, "orders", "جهّز مسودة عرض سعر وبعتها للاعتماد", "YZ-T9W4KD", "11:42 ص", "", ""],
  [5, "prod", "علّم 10 قطع اتطبعت (36 من 60)", "YZ-W4N8TS", "11:30 ص", "", ""],
  [3, "money", "سجّل عربون [المبلغ] كاش", "YZ-W4N8TS", "11:05 ص", "مستني تأكيدك", "warn"],
  [2, "design", "رفع نسخة 2 من الموكاب", "YZ-T9W4KD", "10:50 ص", "", ""],
  [4, "orders", "فتح رقم موبايل العميل", "YZ-Q2M7HP", "10:31 ص", "بيانات حساسة", "role"],
  [4, "orders", "طلب بيانات من العميل على واتساب", "YZ-B6R2NX", "10:20 ص", "", ""],
  [3, "money", "كود التحقق اتكتب غلط مرتين قبل التسليم", "YZ-M3X9QA", "10:02 ص", "راجعها", "warn"],
  [5, "prod", "نقل الكابات لفحص الجودة", "YZ-K7D2PM", "9:40 ص", "", ""],
  [2, "design", "بلّغ الاستقبال إن ملف العميل دقته قليلة", "YZ-R5L1VB", "9:22 ص", "", ""],
  [2, "access", "حاول يفتح «الزيارات والترافيك» وطلب صلاحية", "", "9:15 ص", "اتمنع", "off"],
  [1, "orders", "وافق على طلب واتبعتت رسالة واتساب", "YZ-H3J8LC", "9:00 ص", "", ""],
];

const KIND_ROLE: Record<Kind, string> = {
  quote: "استقبال طلبات",
  pay: "تسليم وتحصيل",
  forward: "استقبال طلبات",
  perm: "مصمم",
};
const YES_MSG: Record<Kind, string> = {
  quote: "اتعتمد العرض واتبعت للعميل على واتساب",
  pay: "اتأكدت الدفعة — الإنتاج يقدر يبدأ",
  forward: "اتفتح الطلب في صفحة الطلبات",
  perm: "اتضافت الصلاحية للمصمم",
};
const NO_MSG: Record<Kind, string> = {
  quote: "رجع العرض للاستقبال بملاحظة",
  pay: "اترفضت الدفعة واتبلغ مسؤول التسليم",
  forward: "اتبعت طلب ملف أحسن للعميل",
  perm: "اترفض طلب الصلاحية",
};

function avatar(id: MemberId, size: number): CSSProperties {
  const me = id === 1;
  return {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size > 34 ? 15 : 13,
    fontWeight: 800,
    ...(me
      ? { background: "linear-gradient(180deg,#b8f2de,#7ee8c7)", color: "#01302d" }
      : {
          background: "var(--tile-bg)",
          color: "var(--tile-ink)",
          boxShadow: "0 0 0 1px var(--tint-bd)",
        }),
  };
}

const FLAG = { warn: k.bWarn, role: k.bRole, off: k.bOff, "": "" } as const;

export function TeamBoard() {
  const [range, setRange] = useState<Range>("today");
  const [member, setMember] = useState<MemberId | null>(null);
  const [type, setType] = useState<Type>("all");
  const [pending, setPending] = useState(PENDING);
  const { toast, flash, hide } = useFlash();

  const rangeWord = { today: "النهارده", week: "الأسبوع ده", month: "الشهر ده" }[range];
  const feed = EVENTS.filter(
    ([m, ty]) => (!member || m === member) && (type === "all" || ty === type),
  );
  const done = (id: number, msg: string) => {
    setPending((all) => all.filter((x) => x.id !== id));
    flash(msg);
  };

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader title="نشاط الفريق" subtitle="كل اللي التيم عمله، واللي مستني قرارك">
        <div role="group" aria-label="الفترة" style={{ display: "flex", gap: 6 }}>
          {(
            [
              ["today", "النهارده"],
              ["week", "7 أيام"],
              ["month", "30 يوم"],
            ] as [Range, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={t.chip}
              type="button"
              aria-pressed={range === key}
              onClick={() => setRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className={cn(k.btn, k.soft)}
          type="button"
          onClick={() => flash("اتجهز ملف CSV بالسجل [التصدير الفعلي بعد الربط]")}
          style={{ minHeight: 42, padding: "6px 16px", borderRadius: 999, fontSize: 13 }}
        >
          <Ic d={P.download} size={16} />
          تصدير السجل
        </button>
        <span className={cn(k.badge, k.bWarn)}>بيانات تجريبية</span>
      </KitHeader>

      <section
        className={cn(k.card, s.up, s.d1)}
        aria-labelledby="ap-h"
        style={{
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          border: "1.5px solid var(--warn-bd)",
          boxShadow: "0 0 0 4px rgba(214,174,98,0.12), var(--card-sh)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 id="ap-h" className={k.h2}>
            مستني قرارك{" "}
            <span className={cn(k.badge, k.bWarn)} style={{ marginInlineStart: 6 }}>
              {pending.length}
            </span>
          </h2>
          <span className={k.muted} style={{ fontSize: 12 }}>
            حاجات التيم جهّزها ومحتاجة اعتمادك
          </span>
        </div>
        {pending.length === 0 ? (
          <p className={k.muted} style={{ margin: 0, fontSize: 14 }}>
            مفيش حاجة مستنياك دلوقتي.
          </p>
        ) : null}
        <div
          className={k.stackM}
          style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}
        >
          {pending.map((a) => {
            const by = byId(a.by);
            return (
              <article
                key={a.id}
                className={cn(k.tint, s.fade)}
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden="true" style={avatar(a.by, 34)}>
                    {by.ini}
                  </span>
                  <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    <strong className={k.strong} style={{ fontSize: 14 }}>
                      {a.title}
                    </strong>
                    <span className={k.muted} style={{ fontSize: 12 }}>
                      {by.name} · {KIND_ROLE[a.kind]} · {a.t}
                    </span>
                  </span>
                  <span dir="ltr" className={cn(k.badge, k.bRole)}>
                    {a.order || "—"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "21px" }}>{a.detail}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={cn(k.btn, k.cta)}
                    type="button"
                    onClick={() => done(a.id, YES_MSG[a.kind])}
                    style={{ minHeight: 38, padding: "4px 16px", borderRadius: 999, fontSize: 13 }}
                  >
                    {a.yes}
                  </button>
                  <button
                    className={cn(k.btn, k.line)}
                    type="button"
                    onClick={() => done(a.id, NO_MSG[a.kind])}
                    style={{ minHeight: 38, padding: "4px 16px", borderRadius: 999, fontSize: 13 }}
                  >
                    {a.no}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-label="أعضاء الفريق"
        className={cn(s.up, s.d2, k.twoM)}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}
      >
        {MEMBERS.filter((m) => m.id !== 1).map((m) => {
          if (!("k" in m)) return null;
          const on = member === m.id;
          const [actions, kpi, kpiLabel] = m.k[range];
          return (
            <button
              key={m.id}
              className={cn(k.card, k.lift, t.member)}
              type="button"
              aria-pressed={on}
              onClick={() => setMember(on ? null : m.id)}
              style={{
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                textAlign: "right",
                fontFamily: "inherit",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                <span aria-hidden="true" style={avatar(m.id, 40)}>
                  {m.ini}
                </span>
                <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <strong className={k.strong} style={{ fontSize: 14 }}>
                    {m.name}
                  </strong>
                  <span className={k.muted} style={{ fontSize: 12 }}>
                    {m.role}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    ...(m.on
                      ? { background: "#7ee8c7", boxShadow: "0 0 8px rgba(126,232,199,0.8)" }
                      : { background: "var(--off-bg)", boxShadow: "inset 0 0 0 1px var(--line)" }),
                  }}
                />
              </span>
              <span
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 6,
                  width: "100%",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <strong className={k.strong} style={{ fontSize: 20 }}>
                    {actions}
                  </strong>
                  <span className={k.muted} style={{ fontSize: 11 }}>
                    إجراء {rangeWord}
                  </span>
                </span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <strong className={k.strong} style={{ fontSize: 20 }}>
                    {kpi}
                  </strong>
                  <span className={k.muted} style={{ fontSize: 11 }}>
                    {kpiLabel}
                  </span>
                </span>
              </span>
              <span className={k.muted} style={{ fontSize: 11 }}>
                {m.last}
              </span>
            </button>
          );
        })}
      </section>

      <div
        className={k.stackM}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          className={cn(k.card, s.up, s.d3)}
          aria-labelledby="fd-h"
          style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h2 id="fd-h" className={k.h2}>
              سجل النشاط{member ? ` — ${byId(member).name}` : ""}
            </h2>
            <div
              role="group"
              aria-label="نوع النشاط"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {TYPES.map(([key, label]) => (
                <button
                  key={key}
                  className={t.chip}
                  type="button"
                  aria-pressed={type === key}
                  onClick={() => setType(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {feed.map(([m, ty, text, order, time, flag, tone], i) => {
              const who = byId(m);
              return (
                <li
                  key={i}
                  className={s.fade}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span aria-hidden="true" style={avatar(m, 34)}>
                    {who.ini}
                  </span>
                  <div
                    style={{
                      flexGrow: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: "22px" }}>
                      <strong className={k.strong}>{who.name}</strong> {text}{" "}
                      {order ? (
                        <span dir="ltr" className={cn(k.badge, k.bRole)}>
                          {order}
                        </span>
                      ) : null}
                    </span>
                    <span className={k.muted} style={{ fontSize: 12 }}>
                      النهارده {time} · {TYPES.find(([key]) => key === ty)?.[1]}
                    </span>
                  </div>
                  {flag ? (
                    <span className={cn(k.badge, FLAG[tone])} style={{ alignSelf: "flex-start" }}>
                      {flag}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {feed.length === 0 ? (
            <p className={k.muted} style={{ margin: 0, fontSize: 14 }}>
              مفيش نشاط بالفلتر ده.
            </p>
          ) : null}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section
            className={cn(k.card, s.up, s.d3)}
            aria-labelledby="al-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <h2 id="al-h" className={k.h2}>
              تنبيهات
            </h2>
            {[
              ["طلب جديد من غير رد من 3 ساعات:", "YZ-R5L1VB. الحد المتفق عليه [مدة الرد للتأكيد]."],
              ["كود تسليم غلط مرتين:", "YZ-M3X9QA — اتأكد من هوية المستلم."],
              ["دعوة معلّقة:", "[مسؤول التسليم] لسه ما فعّلش حسابه الجديد."],
            ].map(([title, detail]) => (
              <div
                key={title}
                style={{
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "var(--warn-bg)",
                  border: "1px solid var(--warn-bd)",
                  color: "var(--warn-ink)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 13,
                  lineHeight: "21px",
                }}
              >
                <Ic d={P.warn} size={18} style={{ marginTop: 2 }} />
                <span>
                  <strong>{title}</strong> {detail}
                </span>
              </div>
            ))}
          </section>
          <section
            className={cn(k.card, s.up, s.d3)}
            aria-labelledby="sn-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <h2 id="sn-h" className={k.h2}>
              الوصول للبيانات الحساسة
            </h2>
            <p className={k.muted} style={{ margin: 0, fontSize: 12, lineHeight: "19px" }}>
              مين فتح أرقام العملاء أو بيانات الدفع النهارده.
            </p>
            {[
              ["[اسم الموظف]", "فتح أرقام عملاء", "7 مرات"],
              ["[مسؤول التسليم]", "فتح أرقام عملاء", "3 مرات"],
              ["[مسؤول التسليم]", "سجّل دفعات", "1"],
            ].map(([who, what, n]) => (
              <div
                key={`${who}-${what}`}
                className={k.tint}
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <strong className={k.strong}>{who}</strong>
                <span style={{ flexGrow: 1 }}>{what}</span>
                <span className={k.muted}>{n}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}
