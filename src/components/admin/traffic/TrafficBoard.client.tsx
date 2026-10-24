"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { liveVisitorsAction } from "@/app/(dashboard)/dashboard/traffic/actions";
import { cn } from "@/lib/cn";
import type { TrafficPeriod, TrafficReport } from "@/modules/content";
import s from "../admin.module.css";
import { Ic } from "../Ic";
import { MobileHeader, Neon } from "../MobileHeader";
import { PageHeader } from "../PageHeader";
import { sx } from "../theme";
import {
  deltaText,
  DEVICE_META,
  DOWN,
  fmt,
  KPI_ICONS,
  smoothPath,
  SOURCE_META,
  UP,
  type Range,
} from "./data";
import t from "./traffic.module.css";

const INFO = "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 16v-4M12 8h.01";

/** How often the live pill asks the server again. */
const LIVE_POLL_MS = 30_000;

/**
 * Traffic (brief B12), from docs/design/Admin-Traffic.html and Admin-Traffic-Mobile.html.
 * Real figures from `getTrafficReport` (first-party page views, ADR-0008).
 */
export function TrafficBoard({ data }: { data: TrafficReport }) {
  const [range, setRange] = useState<Range>("d7");
  const [hov, setHov] = useState(-1);
  const [table, setTable] = useState(false);
  const [live, setLive] = useState(data.live);

  useEffect(() => {
    const iv = setInterval(async () => {
      if (document.hidden) return;
      const result = await liveVisitorsAction();
      if (result.ok) setLive(result.data);
    }, LIVE_POLL_MS);
    return () => clearInterval(iv);
  }, []);

  const pick = (r: Range) => {
    setRange(r);
    setHov(-1);
  };
  const d = derived(data.periods[range]);
  const props = { d, since: data.since, range, pick, hov, setHov, table, setTable, live };
  return (
    <>
      <Desktop {...props} />
      <Mobile {...props} />
    </>
  );
}

type Props = {
  d: Derived;
  since: Date | null;
  range: Range;
  pick: (r: Range) => void;
  hov: number;
  setHov: (i: number) => void;
  table: boolean;
  setTable: (v: boolean) => void;
  live: number;
};

function derived(p: TrafficPeriod) {
  const max = Math.max(0, ...p.vals);
  return {
    ...p,
    n: p.vals.length,
    total: p.visits,
    max,
    top: Math.ceil(max / 10) * 10 || 10,
  };
}

const sinceFmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  timeZone: "Africa/Cairo",
  day: "numeric",
  month: "long",
});

/** The notice under the header: what the numbers are, and since when. */
function notice(since: Date | null, mobile: boolean) {
  if (!since) {
    return mobile
      ? "لا توجد زيارات مسجّلة بعد. ستبدأ الأرقام في الظهور مع أول زائر."
      : "لا توجد زيارات مسجّلة بعد. ستبدأ الأرقام في الظهور مع أول زائر للموقع، دون ملفات تعريف الارتباط (cookies) ودون أي بيانات شخصية للزوار.";
  }
  const from = sinceFmt.format(since);
  return mobile
    ? `أرقام حقيقية من الموقع منذ ${from}، مجمّعة ودون بيانات شخصية.`
    : `هذه الأرقام زيارات حقيقية للموقع، مسجّلة منذ ${from}. نحسبها دون ملفات تعريف الارتباط (cookies) ودون أي بيانات شخصية للزوار، ولا تُحتسب زيارات الفريق أثناء تسجيل الدخول.`;
}

/* ================================ Desktop ================================ */

function Desktop({ d, since, range, pick, hov, setHov, table, setTable, live }: Props) {
  const kpis = [
    {
      label: "الزيارات",
      value: fmt(d.total),
      icon: KPI_ICONS.visits,
      delta: d.deltas.visits,
      hero: true,
    },
    {
      label: "زوار فريدون",
      value: fmt(d.visitors),
      icon: KPI_ICONS.unique,
      delta: d.deltas.visitors,
    },
    { label: "طلبات مُرسلة", value: fmt(d.orders), icon: KPI_ICONS.orders, delta: d.deltas.orders },
    {
      label: "معدل التحويل",
      value: `${d.conv.toFixed(1)}%`,
      icon: KPI_ICONS.conv,
      delta: d.deltas.conv,
    },
  ];
  const ranges: [Range, string][] = [
    ["today", "اليوم"],
    ["d7", "آخر 7 أيام"],
    ["d30", "آخر 30 يومًا"],
  ];
  const rangeWord = { today: "اليوم (كل ساعة)", d7: "آخر 7 أيام", d30: "آخر 30 يومًا" }[range];

  return (
    <div
      className={s.d}
      data-ornament="300"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <PageHeader
        title="الزيارات وحركة الزوار"
        subtitle="من يزور الموقع، ومن أين أتى، وكم منهم أرسل طلبًا"
      >
        <span className={cn(s.pill, t.pill)}>
          <span className={t.liveDot} aria-hidden="true" />
          {fmt(live)} زائر على الموقع الآن
        </span>
        <div
          role="group"
          aria-label="الفترة"
          {...sx(
            {
              display: "flex",
              gap: 6,
              padding: 4,
              borderRadius: 999,
              background: "rgba(126,232,199,0.12)",
              boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.12)",
            },
            {
              background: "rgba(126,232,199,0.05)",
              boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.18)",
            },
          )}
        >
          {ranges.map(([key, label]) => (
            <button
              key={key}
              className={cn(s.btn, s.chip, t.chip, range === key ? s.chipOn : s.chipOff)}
              type="button"
              aria-pressed={range === key}
              onClick={() => pick(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <p
        {...sx(
          {
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 18,
            background: "linear-gradient(135deg,rgba(184,242,222,.45),rgba(126,232,199,.16))",
            boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.12)",
            fontSize: 13,
            lineHeight: "22px",
          },
          {
            background: "rgba(126,232,199,0.06)",
            boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.2)",
            color: "rgba(242,251,248,0.85)",
          },
          cn(s.up, s.d1),
        )}
      >
        <Ic d={INFO} size={18} {...sx({ color: "#005c58" }, { color: "#7ee8c7" })} />
        <span>{notice(since, false)}</span>
      </p>

      <section
        className={cn(s.up, s.d1)}
        aria-label="أهم الأرقام"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </section>

      <section
        className={cn(s.glass, s.up, s.d2)}
        aria-labelledby="vis-h"
        style={{
          borderRadius: 26,
          padding: "18px 20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 id="vis-h" className={t.cardH}>
              الزيارات {rangeWord}
            </h2>
            <span className={t.muted} style={{ fontSize: 12 }}>
              مرّر المؤشر على الرسم لرؤية الرقم بدقة
            </span>
          </div>
          <button
            className={cn(s.btn, s.soft)}
            type="button"
            onClick={() => setTable(!table)}
            aria-pressed={table}
            style={{
              minHeight: 38,
              padding: "4px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {table ? "عرض كرسم" : "عرض كجدول"}
          </button>
        </div>
        {table ? (
          <VisitsTable d={d} range={range} maxHeight={240} />
        ) : (
          <div dir="ltr" style={{ display: "flex", gap: 8 }}>
            <div
              aria-hidden="true"
              {...sx(
                {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: 240,
                  padding: "4px 0 26px",
                  fontSize: 11,
                  color: "rgba(3,9,9,0.5)",
                  textAlign: "right",
                  minWidth: 34,
                },
                { color: "rgba(242,251,248,0.5)" },
              )}
            >
              <span>{fmt(d.top)}</span>
              <span>{fmt(Math.round(d.top / 2))}</span>
              <span>0</span>
            </div>
            <Chart d={d} hov={hov} setHov={setHov} height={240} mobile={false} />
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        <Card id="src-h" title="من أين يأتي الزوار؟" note="نسبة من الزيارات" delay={s.d3}>
          <Sources d={d} mobile={false} />
        </Card>
        <Card id="pg-h" title="أكثر الصفحات زيارة" note="مشاهدات" delay={s.d3}>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {d.pages.length === 0 ? <Empty /> : null}
            {d.pages.map(({ name, path, views: n }, i) => {
              const share = n / (d.pages[0]?.views || 1);
              return (
                <li
                  key={path}
                  title={`${name}: ${fmt(n)} مشاهدة`}
                  {...sx(
                    {
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.6)",
                      boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.08)",
                    },
                    {
                      background: "rgba(126,232,199,0.04)",
                      boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.14)",
                    },
                  )}
                >
                  <span
                    aria-hidden="true"
                    {...sx(
                      {
                        position: "absolute",
                        inset: "0 0 0 auto",
                        width: `${(share * 100).toFixed(0)}%`,
                        background:
                          "linear-gradient(270deg,rgba(126,232,199,0.38),rgba(126,232,199,0.08))",
                        animationDelay: `${(0.35 + i * 0.07).toFixed(2)}s`,
                      },
                      {
                        background:
                          "linear-gradient(270deg,rgba(126,232,199,0.22),rgba(126,232,199,0.03))",
                      },
                      t.bar,
                    )}
                  />
                  <Rank n={i + 1} />
                  <span
                    style={{
                      position: "relative",
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <strong {...sx({ fontSize: 14 }, { color: "#ffffff" })}>{name}</strong>
                    <span
                      dir="ltr"
                      className={t.muted}
                      style={{ fontSize: 11, textAlign: "right" }}
                    >
                      {path}
                    </span>
                  </span>
                  <strong {...sx({ position: "relative", fontSize: 14 }, { color: "#ffffff" })}>
                    {fmt(n)}
                  </strong>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card id="fn-h" title="من الزيارة للطلب" note="مسار التحويل" delay={s.d4} gap={12}>
          <Funnel d={d} mobile={false} />
        </Card>
        <Card id="dv-h" title="الأجهزة" note="نسبة من الزيارات" delay={s.d4}>
          <Devices d={d} mobile={false} />
          {mostlyMobile(d) ? (
            <p className={t.muted} style={{ margin: 0, fontSize: 12, lineHeight: "20px" }}>
              أغلب الزوار من الهواتف، لذا يجب تجربة أي تعديل في الموقع على الهاتف أولًا.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  delta,
  hero = false,
  mobile = false,
}: {
  label: string;
  value: string;
  icon: string;
  /** Null when the previous span has no data to compare with. */
  delta: string | null;
  hero?: boolean;
  mobile?: boolean;
}) {
  const up = !delta || delta.startsWith("+");
  const base: CSSProperties = mobile
    ? { display: "flex", flexDirection: "column", gap: 0, padding: "12px 14px", borderRadius: 20 }
    : { display: "flex", flexDirection: "column", gap: 2, padding: "16px 18px", borderRadius: 24 };
  const card = hero
    ? sx(
        {
          ...base,
          background:
            "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(0,92,88,0.95) 0%, rgba(0,92,88,0) 100%), #01302d",
          color: "#ffffff",
          border: "1px solid rgba(126,232,199,0.45)",
          boxShadow: mobile
            ? "0 0 18px rgba(126,232,199,0.2)"
            : "0 0 22px rgba(126,232,199,0.2), 0 14px 30px rgba(0,43,40,0.2)",
        },
        {
          background:
            "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(5,64,57,0.95) 0%, rgba(5,64,57,0) 100%), #032722",
          color: "#f2fbf8",
          boxShadow: mobile
            ? "0 0 18px rgba(126,232,199,0.15)"
            : "0 0 22px rgba(126,232,199,0.15), 0 14px 30px rgba(0,0,0,0.35)",
        },
        cn(mobile ? undefined : t.kpi, s.dk),
      )
    : sx({ ...base }, { color: "#f2fbf8" }, cn(mobile ? undefined : t.kpi, s.glass));
  const size = mobile ? 28 : 34;
  const wrap: CSSProperties = {
    width: size,
    height: size,
    borderRadius: mobile ? 10 : 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const iconWrap = hero
    ? sx(
        {
          ...wrap,
          background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
          color: "#01302d",
          ...(mobile ? null : { boxShadow: "0 0 12px rgba(126,232,199,0.55)" }),
        },
        { color: "#001412", ...(mobile ? null : { boxShadow: "0 0 12px rgba(126,232,199,0.5)" }) },
      )
    : sx(
        {
          ...wrap,
          background: "linear-gradient(135deg,rgba(220,250,240,.9),rgba(184,242,222,.45))",
          color: "#005c58",
          boxShadow: "0 0 0 1px rgba(0,92,88,0.14)",
        },
        {
          background: "linear-gradient(135deg,rgba(126,232,199,.16),rgba(5,64,57,.45))",
          color: "#7ee8c7",
          boxShadow: undefined,
          border: "1px solid rgba(126,232,199,0.4)",
        },
      );
  // Light: mint on the hero card, teal/brown elsewhere. Dark: mint up, gold down, on every card.
  const deltaColor = sx(
    {
      display: "inline-flex",
      alignItems: "center",
      gap: mobile ? 3 : 4,
      fontSize: mobile ? 11 : 12,
      fontWeight: 800,
      color: hero ? "#7ee8c7" : up ? "#00706a" : "#8a6214",
    },
    { color: up ? "#7ee8c7" : "#d6ae62" },
  );
  return (
    <div {...card}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: mobile ? 12 : 13, fontWeight: 700, opacity: 0.85 }}>{label}</span>
        <span aria-hidden="true" {...iconWrap}>
          <Ic d={icon} size={mobile ? 15 : 18} />
        </span>
      </span>
      <strong
        {...sx(
          {
            fontSize: mobile ? 26 : 34,
            lineHeight: mobile ? "38px" : "46px",
            fontWeight: 800,
          },
          { color: "#ffffff" },
        )}
      >
        {value}
      </strong>
      {delta === null ? (
        <span style={{ fontSize: mobile ? 11 : 12, fontWeight: 600, opacity: 0.75 }}>
          {mobile ? "لا توجد مقارنة" : "لا توجد بيانات للفترة السابقة"}
        </span>
      ) : (
        <span {...deltaColor}>
          <Ic d={up ? UP : DOWN} size={mobile ? 13 : 14} stroke={2.4} />
          {deltaText(delta)}
          {mobile ? null : (
            <>
              {" "}
              <span {...sx({ fontWeight: 500, opacity: 0.8 }, { color: "rgba(242,251,248,0.7)" })}>
                عن الفترة السابقة
              </span>
            </>
          )}
        </span>
      )}
    </div>
  );
}

function Card({
  id,
  title,
  note,
  delay,
  gap = 14,
  children,
}: {
  id: string;
  title: string;
  note: string;
  delay: string | undefined;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(s.glass, s.up, delay)}
      aria-labelledby={id}
      style={{
        borderRadius: 26,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 id={id} className={t.cardH}>
          {title}
        </h2>
        <span className={t.muted} style={{ fontSize: 12 }}>
          {note}
        </span>
      </div>
      {children}
    </section>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span
      {...sx(
        {
          position: "relative",
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg,#00706a,#004541)",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
        },
        { background: "linear-gradient(180deg,#b8f2de,#7ee8c7)", color: "#001412" },
      )}
    >
      {n}
    </span>
  );
}

const BAR_L = "linear-gradient(270deg,#00706a,#2fbfa6)";
const BAR_D = "linear-gradient(270deg,#7ee8c7,#3fc9ae)";

function Sources({ d, mobile }: { d: Derived; mobile: boolean }) {
  if (!d.sources.length) return <Empty />;
  const total = d.sources.reduce((a, x) => a + x.visits, 0) || 1;
  const first = (d.sources[0]?.visits ?? 1) / total;
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: mobile ? 10 : 12,
      }}
    >
      {d.sources.map(({ key, visits: n }, i) => {
        const [name, icon] = SOURCE_META[key];
        const share = n / total;
        return (
          <li
            key={name}
            title={mobile ? undefined : `${name}: ${fmt(n)} زيارة`}
            style={{ display: "flex", flexDirection: "column", gap: mobile ? 4 : 5 }}
          >
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: mobile ? 13 : 14,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: mobile ? 6 : 8,
                  fontWeight: 700,
                }}
              >
                <Ic
                  d={icon}
                  size={mobile ? 15 : 16}
                  {...sx({ color: "#005c58" }, { color: "#7ee8c7" })}
                />
                {name}
              </span>
              <span>
                <strong {...sx({}, { color: "#ffffff" })}>{fmt(n)}</strong>{" "}
                <span className={t.muted}>· {Math.round(share * 100)}%</span>
              </span>
            </span>
            <span
              aria-hidden="true"
              {...sx(
                {
                  height: mobile ? 8 : 10,
                  borderRadius: 999,
                  background: "rgba(0,92,88,0.08)",
                  overflow: "hidden",
                },
                { background: "rgba(126,232,199,0.08)" },
              )}
            >
              <span
                {...sx(
                  {
                    display: "block",
                    height: "100%",
                    width: `${((share / first) * 100).toFixed(1)}%`,
                    borderRadius: 999,
                    background: BAR_L,
                    boxShadow: `0 0 ${mobile ? 8 : 10}px rgba(126,232,199,0.45)`,
                    animationDelay: `${(0.3 + i * 0.07).toFixed(2)}s`,
                  },
                  {
                    background: BAR_D,
                    boxShadow: `0 0 ${mobile ? 8 : 10}px rgba(126,232,199,0.5)`,
                  },
                  t.bar,
                )}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Funnel({ d, mobile }: { d: Derived; mobile: boolean }) {
  const steps: [string, number][] = [
    ["زاروا الموقع", d.funnel.visitors],
    ["فتحوا منشئ الطلب", d.funnel.builder],
    ["أرسلوا طلبًا", d.funnel.submitted],
    ["قُبل طلبهم", d.funnel.approved],
  ];
  // The largest step, not visits: orders from before recording began can outnumber them.
  const base = Math.max(1, ...steps.map(([, n]) => n));
  return (
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {steps.map(([name, count], i) => {
        const next = steps[i + 1];
        const share = Math.min(1, count / base);
        const step = next && count > 0 ? Math.round((next[1] / count) * 100) : 0;
        return (
          <li key={name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: mobile ? 13 : 14,
              }}
            >
              <span style={{ fontWeight: 700 }}>{name}</span>
              <strong {...sx({}, { color: "#ffffff" })}>{fmt(count)}</strong>
            </span>
            <span
              aria-hidden="true"
              {...sx(
                {
                  height: mobile ? 24 : 30,
                  borderRadius: mobile ? 9 : 10,
                  background: "rgba(0,92,88,0.06)",
                  overflow: "hidden",
                },
                { background: "rgba(126,232,199,0.06)" },
              )}
            >
              <span
                {...sx(
                  {
                    display: "block",
                    height: "100%",
                    width: `${Math.max(2, Math.sqrt(share) * 100).toFixed(1)}%`,
                    borderRadius: mobile ? 9 : 10,
                    background: BAR_L,
                    boxShadow: `0 0 ${mobile ? 10 : 12}px rgba(126,232,199,0.45)`,
                    animationDelay: `${(0.4 + i * 0.1).toFixed(2)}s`,
                  },
                  {
                    background: BAR_D,
                    boxShadow: `0 0 ${mobile ? 10 : 12}px rgba(126,232,199,0.5)`,
                  },
                  t.bar,
                )}
              />
            </span>
            {next ? (
              mobile ? (
                <span className={t.muted} style={{ fontSize: 11 }}>
                  ↓ {step}% أكملوا
                </span>
              ) : (
                <span
                  className={t.muted}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Ic d="M12 5v14M19 12l-7 7-7-7" size={14} />
                  {step}% انتقلوا إلى الخطوة التالية
                </span>
              )
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function mostlyMobile(d: Derived) {
  const mobile = d.devices.find((x) => x.key === "mobile")?.pct ?? 0;
  return mobile > 0 && d.devices.every((x) => x.key === "mobile" || x.pct < mobile);
}

/** No data yet for this period. */
function Empty() {
  return (
    <p className={t.muted} style={{ margin: 0, fontSize: 13, lineHeight: "22px" }}>
      لا توجد زيارات في هذه الفترة بعد.
    </p>
  );
}

function Devices({ d, mobile }: { d: Derived; mobile: boolean }) {
  const ring = mobile ? 54 : 66;
  const inner = mobile ? 42 : 52;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: mobile ? 8 : 10,
      }}
    >
      {d.devices.map(({ key, pct }) => {
        const [name, icon] = DEVICE_META[key];
        return (
          <div
            key={key}
            {...sx(
              {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: mobile ? 6 : 8,
                padding: mobile ? "10px 4px" : "14px 8px",
                borderRadius: mobile ? 16 : 18,
                background: "rgba(255,255,255,0.6)",
                boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.08)",
              },
              {
                background: "rgba(126,232,199,0.04)",
                boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.14)",
              },
            )}
          >
            <span
              aria-hidden="true"
              {...sx(
                {
                  width: ring,
                  height: ring,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `conic-gradient(#00706a 0 ${pct}%, rgba(0,92,88,0.1) ${pct}% 100%)`,
                  boxShadow: `0 0 ${mobile ? 12 : 14}px rgba(126,232,199,0.35)`,
                },
                {
                  background: `conic-gradient(#7ee8c7 0 ${pct}%, rgba(126,232,199,0.12) ${pct}% 100%)`,
                  boxShadow: `0 0 ${mobile ? 14 : 16}px rgba(126,232,199,0.3)`,
                },
              )}
            >
              <span
                {...sx(
                  {
                    width: inner,
                    height: inner,
                    borderRadius: 999,
                    background: "#f3faf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#005c58",
                  },
                  { background: "#032722", color: "#7ee8c7" },
                )}
              >
                <Ic d={icon} size={mobile ? 18 : 22} />
              </span>
            </span>
            <strong {...sx({ fontSize: mobile ? 16 : 20 }, { color: "#ffffff" })}>{pct}%</strong>
            <span className={t.muted} style={{ fontSize: mobile ? 11 : 13, fontWeight: 700 }}>
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type Derived = ReturnType<typeof derived>;

function VisitsTable({
  d,
  range,
  maxHeight,
  mobile = false,
}: {
  d: Derived;
  range: Range;
  maxHeight: number;
  mobile?: boolean;
}) {
  return (
    <div style={{ maxHeight, overflowY: "auto" }}>
      <div className={t.tbl} role="table" aria-label="الزيارات">
        <div className={cn(t.tr, mobile && t.trM, t.th)} role="row">
          <span role="columnheader">{range === "today" ? "الساعة" : "اليوم"}</span>
          <span role="columnheader">الزيارات</span>
        </div>
        {d.vals.map((v, i) => (
          <div key={i} className={cn(t.tr, mobile && t.trM)} role="row">
            <span role="cell">{d.labels[i]}</span>
            <span role="cell">{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Line + area chart. Desktop: 800×214 viewBox in 240px; phone: 800×174 in 200px. */
function Chart({
  d,
  hov,
  setHov,
  height,
  mobile,
}: {
  d: Derived;
  hov: number;
  setHov: (i: number) => void;
  height: number;
  mobile: boolean;
}) {
  const vbH = mobile ? 174 : 214;
  const base = mobile ? 170 : 210;
  const pad = mobile ? 160 : 198;
  const pts = d.vals.map(
    (v, i) =>
      [d.n === 1 ? 400 : (i / (d.n - 1)) * 800, base - (v / d.top) * pad] as [number, number],
  );
  const line = smoothPath(pts);
  const area = `${line} L800,${base} L0,${base} Z`;
  const h = hov >= 0 && hov < d.n ? hov : -1;
  const hp: [number, number] = (h >= 0 ? pts[h] : undefined) ?? [0, 0];
  const leftPct = (hp[0] / 800) * 100;
  const topPx = hp[1];
  const ticks = mobile
    ? [0, Math.round((d.n - 1) / 2), d.n - 1]
    : d.n <= 7
      ? d.vals.map((_, i) => i)
      : [
          0,
          Math.round((d.n - 1) / 4),
          Math.round((d.n - 1) / 2),
          Math.round(((d.n - 1) * 3) / 4),
          d.n - 1,
        ];
  const grid = mobile ? [86] : [12, 111];
  const dot = mobile ? 12 : 14;
  const tipW = mobile ? 108 : 120;

  return (
    <div
      dir={mobile ? "ltr" : undefined}
      style={{ position: "relative", flexGrow: mobile ? undefined : 1, height }}
      onMouseLeave={() => setHov(-1)}
    >
      <svg
        viewBox={`0 0 800 ${vbH}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`رسم خطي للزيارات، الإجمالي ${fmt(d.total)} زيارة${mobile ? "" : `، أعلى قيمة ${fmt(d.max)}`}`}
        style={{
          position: "absolute",
          inset: "0 0 26px 0",
          width: "100%",
          height: "calc(100% - 26px)",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id={mobile ? "arm" : "ar"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7ee8c7" stopOpacity=".55" />
            <stop offset="1" stopColor="#7ee8c7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={mobile ? "armd" : "ard"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7ee8c7" stopOpacity=".38" />
            <stop offset="1" stopColor="#7ee8c7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[...grid, base].map((y, i, all) => (
          <Themed key={y}>
            {(dark) => (
              <line
                x1="0"
                x2="800"
                y1={y}
                y2={y}
                stroke={
                  dark
                    ? `rgba(126,232,199,${i === all.length - 1 ? 0.25 : 0.1})`
                    : `rgba(0,92,88,${i === all.length - 1 ? 0.25 : 0.1})`
                }
                vectorEffect="non-scaling-stroke"
              />
            )}
          </Themed>
        ))}
        <Themed>
          {(dark) => (
            <path
              className={t.area}
              d={area}
              fill={`url(#${mobile ? "arm" : "ar"}${dark ? "d" : ""})`}
            />
          )}
        </Themed>
        <Themed>
          {(dark) => (
            <path
              className={t.draw}
              d={line}
              pathLength={1}
              fill="none"
              stroke={dark ? "#7ee8c7" : "#00706a"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                filter: `drop-shadow(0 0 ${dark ? 5 : 4}px rgba(126,232,199,0.8))`,
              }}
            />
          )}
        </Themed>
        <Themed>
          {(dark) => (
            <line
              x1={hp[0].toFixed(1)}
              x2={hp[0].toFixed(1)}
              y1="0"
              y2={base}
              stroke={dark ? "rgba(126,232,199,0.45)" : "rgba(0,92,88,0.35)"}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              opacity={h >= 0 ? 1 : 0}
            />
          )}
        </Themed>
      </svg>
      {mobile ? (
        <span
          aria-hidden="true"
          {...sx(
            { position: "absolute", top: 0, left: 0, fontSize: 10, color: "rgba(3,9,9,0.5)" },
            { color: "rgba(242,251,248,0.5)" },
          )}
        >
          {fmt(d.top)}
        </span>
      ) : null}
      {h >= 0 ? (
        <>
          <span
            aria-hidden="true"
            {...sx(
              {
                position: "absolute",
                left: `calc(${leftPct.toFixed(2)}% - ${dot / 2}px)`,
                top: Math.round(topPx - dot / 2),
                width: dot,
                height: dot,
                borderRadius: 999,
                background: "#00706a",
                border: `${mobile ? 2 : 3}px solid #ffffff`,
                boxShadow: `0 0 0 2px #00706a, 0 0 ${mobile ? 12 : 14}px rgba(126,232,199,0.9)`,
                pointerEvents: "none",
                transition:
                  "left .35s cubic-bezier(.22,1,.36,1), top .35s cubic-bezier(.22,1,.36,1)",
              },
              {
                background: "#7ee8c7",
                border: `${mobile ? 2 : 3}px solid #001412`,
                boxShadow: `0 0 0 2px #7ee8c7, 0 0 ${mobile ? 12 : 14}px rgba(126,232,199,0.9)`,
              },
            )}
          />
          <div
            role="status"
            {...sx(
              {
                position: "absolute",
                zIndex: 2,
                left: `clamp(0px, calc(${leftPct.toFixed(2)}% - ${tipW / 2}px), calc(100% - ${tipW}px))`,
                top: Math.max(0, Math.round(topPx - (mobile ? 62 : 70))),
                width: tipW,
                padding: mobile ? "6px 10px" : "8px 12px",
                borderRadius: mobile ? 12 : 14,
                background: "#01302d",
                color: "#ffffff",
                textAlign: "center",
                pointerEvents: "none",
                border: "1px solid rgba(126,232,199,0.5)",
                boxShadow: mobile
                  ? "0 0 16px rgba(126,232,199,0.35)"
                  : "0 0 18px rgba(126,232,199,0.35), 0 10px 22px rgba(0,43,40,0.25)",
              },
              {
                background: "#032722",
                boxShadow: mobile
                  ? "0 0 16px rgba(126,232,199,0.3)"
                  : "0 0 18px rgba(126,232,199,0.3), 0 10px 22px rgba(0,0,0,0.4)",
              },
              t.tip,
            )}
          >
            <strong style={{ display: "block", fontSize: mobile ? 14 : 15 }}>
              {fmt(d.vals[h] ?? 0)} زيارة
            </strong>
            <span style={{ fontSize: mobile ? 10 : 11, opacity: 0.8 }}>{d.labels[h]}</span>
          </div>
        </>
      ) : null}
      <div style={{ position: "absolute", inset: "0 0 26px 0", display: "flex" }}>
        {d.vals.map((_, i) => (
          <span
            key={i}
            onMouseEnter={() => setHov(i)}
            onClick={mobile ? () => setHov(i) : undefined}
            style={{ flex: "1 1 0", height: "100%", cursor: mobile ? undefined : "crosshair" }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        {...sx(
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: mobile ? 20 : 22,
            display: "flex",
            justifyContent: "space-between",
            fontSize: mobile ? 10 : 11,
            color: "rgba(3,9,9,0.5)",
          },
          { color: "rgba(242,251,248,0.5)" },
        )}
      >
        {ticks.map((i) => (
          <span key={i}>{d.labels[i]}</span>
        ))}
      </div>
    </div>
  );
}

/** SVG paint differs per theme: render the light and dark element, CSS shows one. */
function Themed({ children }: { children: (dark: boolean) => ReactNode }) {
  return (
    <>
      <g className={s.lightOnly}>{children(false)}</g>
      <g className={s.darkOnly}>{children(true)}</g>
    </>
  );
}

/* ================================ Mobile ================================ */

function Mobile({ d, since, range, pick, hov, setHov, table, setTable, live }: Props) {
  const kpis = [
    {
      label: "الزيارات",
      value: fmt(d.total),
      icon: KPI_ICONS.visits,
      delta: d.deltas.visits,
      hero: true,
    },
    {
      label: "زوار فريدون",
      value: fmt(d.visitors),
      icon: KPI_ICONS.uniqueM,
      delta: d.deltas.visitors,
    },
    { label: "طلبات مُرسلة", value: fmt(d.orders), icon: KPI_ICONS.orders, delta: d.deltas.orders },
    {
      label: "معدل التحويل",
      value: `${d.conv.toFixed(1)}%`,
      icon: KPI_ICONS.conv,
      delta: d.deltas.conv,
    },
  ];
  const ranges: [Range, string][] = [
    ["today", "اليوم"],
    ["d7", "7 أيام"],
    ["d30", "30 يومًا"],
  ];
  const rangeWord = { today: "اليوم", d7: "آخر 7 أيام", d30: "آخر 30 يومًا" }[range];
  const topInner = d.pages.find((x) => x.path !== "/");
  const mCard = (id: string, title: string, gap: number, children: ReactNode, pad = "14px") => (
    <section
      className={cn(s.glass, s.up, s.d3)}
      aria-labelledby={id}
      style={{ borderRadius: 24, padding: pad, display: "flex", flexDirection: "column", gap }}
    >
      <h2 id={id} className={cn(t.cardH, t.cardHM)}>
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className={s.m} style={{ position: "relative", isolation: "isolate" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-teal.svg"
        alt=""
        aria-hidden="true"
        className={s.lightOnly}
        style={{
          position: "absolute",
          zIndex: -1,
          top: 700,
          left: -200,
          width: 420,
          height: 420,
          pointerEvents: "none",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.darkOnly, s.ornament)}
        style={{
          position: "absolute",
          zIndex: -1,
          top: 700,
          left: -200,
          width: 420,
          height: 420,
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />
      <MobileHeader
        title={
          <>
            الزيارات <Neon>وحركة الزوار</Neon>
          </>
        }
        sub={
          <span
            {...sx(
              {
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "rgba(255,255,255,0.78)",
              },
              { color: "rgba(242,251,248,0.72)" },
            )}
          >
            <span className={cn(t.liveDot, t.liveDotM)} aria-hidden="true" />
            {fmt(live)} زائر الآن
          </span>
        }
      >
        <div
          className={s.glassDark}
          role="group"
          aria-label="الفترة"
          style={{ marginTop: 12, display: "flex", gap: 4, padding: 4, borderRadius: 999 }}
        >
          {ranges.map(([key, label]) => (
            <button
              key={key}
              className={cn(s.btn, t.seg, range === key ? t.segOn : t.segOff)}
              type="button"
              aria-pressed={range === key}
              onClick={() => pick(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </MobileHeader>

      <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        <p
          {...sx(
            {
              margin: 0,
              padding: "8px 12px",
              borderRadius: 14,
              background: "linear-gradient(135deg,rgba(184,242,222,.45),rgba(126,232,199,.16))",
              boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.12)",
              fontSize: 12,
              lineHeight: "20px",
            },
            {
              background: "rgba(126,232,199,0.06)",
              boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.2)",
              color: "rgba(242,251,248,0.85)",
            },
            s.up,
          )}
        >
          {notice(since, true)}
        </p>
        <section
          className={cn(s.up, s.d1)}
          aria-label="أهم الأرقام"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {kpis.map((k) => (
            <Kpi key={k.label} {...k} mobile />
          ))}
        </section>
        <section
          className={cn(s.glass, s.up, s.d2)}
          aria-labelledby="mv-h"
          style={{
            borderRadius: 24,
            padding: "14px 14px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h2 id="mv-h" className={cn(t.cardH, t.cardHM)}>
                الزيارات {rangeWord}
              </h2>
              <span className={t.muted} style={{ fontSize: 11 }}>
                اضغط على الرسم لرؤية الرقم
              </span>
            </div>
            <button
              className={cn(s.btn, s.soft)}
              type="button"
              onClick={() => setTable(!table)}
              aria-pressed={table}
              style={{
                minHeight: 36,
                padding: "2px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {table ? "رسم" : "جدول"}
            </button>
          </div>
          {table ? (
            <VisitsTable d={d} range={range} maxHeight={200} mobile />
          ) : (
            <Chart d={d} hov={hov} setHov={setHov} height={200} mobile />
          )}
        </section>
        {mCard("ms-h", "من أين يأتي الزوار؟", 12, <Sources d={d} mobile />)}
        {mCard("mf-h", "من الزيارة للطلب", 10, <Funnel d={d} mobile />)}
        {mCard(
          "md-h",
          "الأجهزة وأكثر صفحة",
          12,
          <>
            <Devices d={d} mobile />
            <div
              {...sx(
                {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg,rgba(184,242,222,.45),rgba(126,232,199,.16))",
                },
                {
                  background: "rgba(126,232,199,0.07)",
                  boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.2)",
                },
              )}
            >
              <Rank n={1} />
              <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <strong {...sx({ fontSize: 13 }, { color: "#ffffff" })}>
                  {topInner?.name ?? "لا يوجد بعد"}
                </strong>
                <span className={t.muted} style={{ fontSize: 11 }}>
                  أكثر صفحة شوهدت بعد الرئيسية
                </span>
              </span>
              <strong {...sx({ fontSize: 13 }, { color: "#ffffff" })}>
                {fmt(topInner?.views ?? 0)}
              </strong>
            </div>
          </>,
        )}
      </div>
    </div>
  );
}
