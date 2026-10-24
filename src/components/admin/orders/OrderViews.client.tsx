"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { MobileHeader, Neon } from "../MobileHeader";
import { PageHeader } from "../PageHeader";
import { sx } from "../theme";
import { orderImage, type Order } from "./data";
import {
  bulkChips,
  CUSTOMER_ICON,
  CUSTOMER_TYPE,
  FILTERS,
  isClosed,
  isDecidable,
  isOrg,
  STAGES,
  STATUS,
  statusLabel,
  type DialogKind,
} from "./logic";
import type { BoardActions, BoardState, StatusFilter, TypeFilter } from "./OrdersBoard.client";
import o from "./orders.module.css";

type ViewProps = {
  state: BoardState;
  list: Order[];
  patch: (p: Partial<BoardState>) => void;
  open: (kind: DialogKind, id: string) => void;
};

function badge(r: Order, big = false) {
  const st = STATUS[r.status];
  return sx(
    {
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: big ? "4px 14px" : "2px 10px",
      borderRadius: 999,
      fontSize: big ? 14 : 12,
      lineHeight: "20px",
      fontWeight: 700,
      whiteSpace: "nowrap",
      ...st.l,
    },
    { boxShadow: undefined, ...st.d },
  );
}

/* ================================ Desktop (Admin.html) ================================ */

export function OrdersDesktop({
  state,
  list,
  patch,
  open,
  actions,
}: ViewProps & { actions: BoardActions }) {
  const sel = state.orders.find((r) => r.id === state.selId);
  return (
    <div className={s.d} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="الطلبات" subtitle="راجع الطلبات الجديدة واتخذ القرار">
        <label
          style={{ position: "relative", display: "flex", alignItems: "center", flex: "0 1 320px" }}
        >
          <span className={s.srOnly}>بحث برقم الطلب أو اسم العميل</span>
          <Ic
            d={P.search}
            size={18}
            {...sx(
              { position: "absolute", right: 14, color: "rgba(3,9,9,0.55)" },
              { color: "rgba(242,251,248,0.55)" },
            )}
          />
          <input
            className={s.fld}
            type="search"
            value={state.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="رقم الطلب أو اسم العميل"
            style={{ borderRadius: 999, paddingRight: 42 }}
          />
        </label>
        <button className={cn(s.btn, s.soft, s.icon)} type="button" aria-label="الإشعارات">
          <Ic d={P.bell} size={20} />
        </button>
      </PageHeader>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Stats state={state} patch={patch} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
          <OrderList state={state} list={list} patch={patch} />
          {sel ? <OrderDetail key={sel.id} r={sel} open={open} actions={actions} /> : null}
        </div>
      </div>
    </div>
  );
}

function Stats({ state, patch }: Pick<ViewProps, "state" | "patch">) {
  const stats = [
    { key: "new", label: "جديدة بانتظار المراجعة", sub: "محتاجة قرار", icon: P.inbox },
    { key: "awaiting", label: "بانتظار رد العميل", sub: "اتطلب منه بيانات", icon: P.clock },
    { key: "approved", label: "اتقبلت", sub: "آخر 7 أيام", icon: P.ok },
    { key: "rejected", label: "اترفضت", sub: "آخر 7 أيام", icon: P.no },
  ] as const;
  return (
    <section
      className={cn(s.up, s.d1)}
      aria-label="ملخص"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14,
      }}
    >
      {stats.map((t) => {
        const on = state.filter === t.key;
        const hero = t.key === "new";
        const base: CSSProperties = {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
          padding: "16px 18px",
          borderRadius: 24,
          textAlign: "right",
          fontFamily: "inherit",
        };
        const style = hero
          ? sx(
              {
                ...base,
                background:
                  "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(0,92,88,0.95) 0%, rgba(0,92,88,0) 100%), #01302d",
                color: "#ffffff",
                border: on ? "2px solid #7ee8c7" : "1px solid rgba(126,232,199,0.45)",
                boxShadow: on
                  ? "0 0 26px rgba(126,232,199,0.5)"
                  : "0 0 22px rgba(126,232,199,0.2), 0 14px 30px rgba(0,43,40,0.2)",
              },
              {
                background:
                  "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(5,64,57,0.95) 0%, rgba(5,64,57,0) 100%), #032722",
                color: "#f2fbf8",
                boxShadow: on
                  ? "0 0 26px rgba(126,232,199,0.45)"
                  : "0 0 22px rgba(126,232,199,0.15), 0 14px 30px rgba(0,0,0,0.35)",
              },
              cn(s.stat, s.btn, s.dk),
            )
          : sx(
              {
                ...base,
                color: "#030909",
                ...(on
                  ? {
                      border: "2px solid #00706a",
                      boxShadow: "0 0 0 4px rgba(126,232,199,0.25), 0 10px 26px rgba(0,92,88,0.12)",
                    }
                  : null),
              },
              {
                color: "#f2fbf8",
                ...(on
                  ? {
                      border: "2px solid #7ee8c7",
                      boxShadow:
                        "0 0 0 4px rgba(126,232,199,0.15), 0 0 22px rgba(126,232,199,0.25)",
                    }
                  : null),
              },
              cn(s.stat, s.btn, s.glass),
            );
        const iconWrap: CSSProperties = {
          width: 38,
          height: 38,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        };
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => patch({ filter: on ? "all" : t.key })}
            {...style}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, opacity: 0.85 }}>
                {t.label}
              </span>
              <span
                aria-hidden="true"
                {...(hero
                  ? sx(
                      {
                        ...iconWrap,
                        background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
                        color: "#01302d",
                        boxShadow: "0 0 14px rgba(126,232,199,0.55)",
                      },
                      { color: "#001412", boxShadow: "0 0 14px rgba(126,232,199,0.5)" },
                    )
                  : sx(
                      {
                        ...iconWrap,
                        background:
                          "linear-gradient(135deg,rgba(220,250,240,.9),rgba(184,242,222,.45))",
                        color: "#005c58",
                        boxShadow: "0 0 0 1px rgba(0,92,88,0.14)",
                      },
                      {
                        background:
                          "linear-gradient(135deg,rgba(126,232,199,.16),rgba(5,64,57,.45))",
                        color: "#7ee8c7",
                        boxShadow: undefined,
                        border: "1px solid rgba(126,232,199,0.4)",
                      },
                    ))}
              >
                <Ic d={t.icon} size={20} />
              </span>
            </span>
            <span
              {...sx({ fontSize: 36, lineHeight: "48px", fontWeight: 800 }, { color: "#ffffff" })}
            >
              {state.stats[t.key]}
            </span>
            <span {...sx({ fontSize: 12, lineHeight: "18px", opacity: 0.75 }, { opacity: 0.7 })}>
              {t.sub}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function Chip({
  on,
  onClick,
  children,
  className,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={cn(s.btn, s.chip, on ? s.chipOn : s.chipOff, className)}
      type="button"
      aria-pressed={on}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OrderList({ state, list, patch }: Pick<ViewProps, "state" | "list" | "patch">) {
  const tfilters: [TypeFilter, string, string][] = [
    ["all", "الكل", CUSTOMER_ICON.all],
    ["person", "أفراد", CUSTOMER_ICON.person],
    ["org", "شركات وجهات", CUSTOMER_ICON.biz],
  ];
  return (
    <section
      aria-labelledby="list-h"
      className={cn(s.glass, s.up, s.d2)}
      style={{ flex: "1 1 400px", minWidth: 0, borderRadius: 26, overflow: "hidden" }}
    >
      <div
        {...sx(
          {
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderBottom: "1px solid rgba(0,92,88,0.1)",
          },
          { borderBottom: "1px solid rgba(126,232,199,0.12)" },
        )}
      >
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <h2
            id="list-h"
            {...sx(
              { margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 800 },
              { color: "#ffffff" },
            )}
          >
            قائمة الطلبات
          </h2>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}
          >
            ترتيب
            <select
              className={s.fld}
              value={state.sort}
              onChange={(e) => patch({ sort: e.target.value === "old" ? "old" : "new" })}
              style={{ width: "auto", minHeight: 38, padding: "4px 10px", fontSize: 13 }}
            >
              <option value="new">الأحدث أولًا</option>
              <option value="old">الأقدم أولًا</option>
            </select>
          </label>
        </div>
        <div
          role="group"
          aria-label="فلتر الحالة"
          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        >
          {FILTERS.map(([key, label]) => (
            <Chip key={key} on={state.filter === key} onClick={() => patch({ filter: key })}>
              {label}
            </Chip>
          ))}
        </div>
        <div
          role="group"
          aria-label="فلتر نوع العميل"
          style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
        >
          <span
            {...sx(
              { fontSize: 12, fontWeight: 700, color: "rgba(3,9,9,0.6)" },
              { color: "rgba(242,251,248,0.6)" },
            )}
          >
            نوع العميل:
          </span>
          {tfilters.map(([key, label, icon]) => (
            <Chip key={key} on={state.tfilter === key} onClick={() => patch({ tfilter: key })}>
              <Ic d={icon} size={14} />
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <ul aria-label="الطلبات" style={{ listStyle: "none", margin: 0, padding: 6 }}>
        {list.map((r, idx) => {
          const cur = r.id === state.selId;
          return (
            <li
              key={r.id}
              className={s.up}
              style={{ animationDelay: `${(0.2 + idx * 0.06).toFixed(2)}s` }}
            >
              <button
                type="button"
                onClick={() => patch({ selId: r.id })}
                aria-current={cur}
                {...sx(
                  {
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    marginBottom: 4,
                    borderRadius: 18,
                    border: `1px solid ${cur ? "rgba(0,92,88,0.25)" : "transparent"}`,
                    color: "#030909",
                    background: cur
                      ? "linear-gradient(135deg,rgba(184,242,222,.65),rgba(126,232,199,.25))"
                      : "transparent",
                    ...(cur
                      ? { boxShadow: "inset -4px 0 0 #00706a, 0 0 16px rgba(126,232,199,0.3)" }
                      : null),
                  },
                  {
                    border: `1px solid ${cur ? "rgba(126,232,199,0.45)" : "transparent"}`,
                    color: "#f2fbf8",
                    background: cur
                      ? "linear-gradient(180deg,rgba(126,232,199,0.16),rgba(126,232,199,0.05))"
                      : "transparent",
                    ...(cur
                      ? { boxShadow: "inset -4px 0 0 #7ee8c7, 0 0 16px rgba(126,232,199,0.18)" }
                      : null),
                  },
                  s.rowbtn,
                )}
              >
                <Image
                  width={50}
                  height={50}
                  src={orderImage(r)}
                  alt=""
                  {...sx(
                    {
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      objectFit: "cover",
                      flexShrink: 0,
                      boxShadow: "0 0 0 1px rgba(0,92,88,0.12)",
                    },
                    { boxShadow: "0 0 0 1px rgba(126,232,199,0.25)" },
                  )}
                />
                <span
                  style={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "right",
                  }}
                >
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <strong {...sx({ fontSize: 15 }, { color: "#ffffff" })}>{r.name}</strong>
                    <span
                      dir="ltr"
                      {...sx(
                        { fontSize: 12, color: "rgba(3,9,9,0.55)", letterSpacing: ".5px" },
                        { color: "rgba(242,251,248,0.5)" },
                      )}
                    >
                      {r.ref}
                    </span>
                  </span>
                  <span
                    {...sx(
                      { fontSize: 13, lineHeight: "20px", color: "rgba(3,9,9,0.65)" },
                      { color: "rgba(242,251,248,0.62)" },
                    )}
                  >
                    {r.product} · {r.when}
                  </span>
                  {isOrg(r) ? (
                    <span
                      {...sx(
                        {
                          alignSelf: "flex-start",
                          marginTop: 3,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "1px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          lineHeight: "18px",
                          fontWeight: 700,
                          background: "rgba(0,92,88,0.08)",
                          color: "#005c58",
                        },
                        { background: "rgba(126,232,199,0.1)", color: "#b8f2de" },
                      )}
                    >
                      <Ic d={CUSTOMER_ICON[r.ctype]} size={12} stroke={2} />
                      {r.org}
                    </span>
                  ) : null}
                </span>
                <span {...badge(r)}>
                  <Ic d={STATUS[r.status].icon} size={14} stroke={2.4} />
                  {statusLabel(r)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.length === 0 ? (
        <div
          style={{
            padding: "40px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <strong style={{ fontSize: 16 }}>
            {state.orders.length ? "مفيش طلبات بالفلتر ده" : "لسه مفيش طلبات"}
          </strong>
          <button
            className={cn(s.btn, s.soft)}
            type="button"
            onClick={() => patch({ q: "", filter: "all", tfilter: "all" })}
            style={{ minHeight: 44, padding: "6px 18px", borderRadius: 999, fontWeight: 700 }}
          >
            امسح الفلاتر
          </button>
        </div>
      ) : null}
      <p
        {...sx(
          {
            margin: 0,
            padding: "12px 18px",
            fontSize: 13,
            color: "rgba(3,9,9,0.6)",
            borderTop: "1px solid rgba(0,92,88,0.08)",
          },
          { color: "rgba(242,251,248,0.55)", borderTop: "1px solid rgba(126,232,199,0.1)" },
        )}
      >
        عرض {list.length} من {state.orders.length} طلب
      </p>
    </section>
  );
}

function OrderDetail({
  r,
  open,
  actions,
}: {
  r: Order;
  open: ViewProps["open"];
  actions: BoardActions;
}) {
  const org = isOrg(r);
  const clientH = org
    ? `العميل · ${CUSTOMER_TYPE[r.ctype]}${r.role ? ` — ${r.role}` : ""}`
    : "العميل";
  const block: CSSProperties = { display: "flex", gap: 12, alignItems: "center" };
  const value = (l: CSSProperties) => sx(l, { color: "#ffffff" });
  const muted = (l: CSSProperties) => sx(l, { color: "rgba(242,251,248,0.62)" });
  const note = sx(
    { margin: "12px 0 0", fontSize: 13, lineHeight: "22px", color: "rgba(3,9,9,0.65)" },
    { color: "rgba(242,251,248,0.72)" },
  );
  const waitQuote = org && r.status !== "approved" && r.status !== "rejected";

  return (
    <section
      aria-labelledby="det-h"
      className={cn(s.glass, s.up, s.d3)}
      style={{
        flex: "1.4 1 520px",
        minWidth: 0,
        borderRadius: 26,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        {...sx(
          {
            position: "relative",
            overflow: "hidden",
            isolation: "isolate",
            padding: "20px 22px",
            background: "#01302d",
            color: "#ffffff",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          },
          { background: "#032722", borderBottom: "1px solid rgba(126,232,199,0.25)" },
          s.dk,
        )}
      >
        <div
          aria-hidden="true"
          {...sx(
            {
              position: "absolute",
              zIndex: -1,
              inset: 0,
              background:
                "radial-gradient(ellipse 70% 120% at 80% 0%, rgba(0,92,88,0.9) 0%, rgba(0,92,88,0) 100%)",
            },
            {
              background:
                "radial-gradient(ellipse 70% 120% at 80% 0%, rgba(5,64,57,0.95) 0%, rgba(5,64,57,0) 100%)",
            },
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
        <img
          src="/images/admin/ornament-mint.svg"
          alt=""
          aria-hidden="true"
          {...sx(
            {
              position: "absolute",
              zIndex: -1,
              top: -140,
              left: -120,
              width: 320,
              height: 320,
              opacity: 0.45,
              pointerEvents: "none",
            },
            { opacity: 0.4 },
            s.ornament,
          )}
        />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <span
            dir="ltr"
            className={s.neon}
            style={{ alignSelf: "flex-end", fontSize: 13, letterSpacing: 1, fontWeight: 700 }}
          >
            {r.ref}
          </span>
          <h2 id="det-h" style={{ margin: 0, fontSize: 24, lineHeight: "36px", fontWeight: 800 }}>
            {r.product}
          </h2>
        </div>
        <span {...badge(r, true)}>
          <Ic d={STATUS[r.status].icon} size={16} stroke={2.4} />
          {statusLabel(r)}
        </span>
      </div>

      <div
        style={{
          padding: "20px 22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        <div style={block}>
          <span className={s.tile} aria-hidden="true" style={{ width: 44, height: 44 }}>
            <Ic d={P.user} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 className={s.h3}>{clientH}</h3>
            {org ? (
              <strong
                {...sx({ fontSize: 14, fontWeight: 800, color: "#005c58" }, { color: "#7ee8c7" })}
              >
                {r.org}
              </strong>
            ) : null}
            <strong {...value({ fontSize: 16 })}>{r.name}</strong>
            <a
              href="https://wa.me/201116891025"
              dir="ltr"
              style={{ alignSelf: "flex-end", fontSize: 14, fontWeight: 700 }}
            >
              {r.phone}
            </a>
          </div>
        </div>
        <div style={block}>
          <span className={s.tile} aria-hidden="true" style={{ width: 44, height: 44 }}>
            <Ic d={P.truck} />
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 className={s.h3}>الاستلام والتاريخ المرغوب</h3>
            <span {...value({ fontSize: 15, fontWeight: 700 })}>{r.receipt}</span>
            <span {...muted({ fontSize: 14, color: "rgba(3,9,9,0.65)" })}>{r.date}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: "1 / -1" }}>
          <h3 className={s.h3}>المواصفات</h3>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {r.specs.map((x) => (
              <Spec key={x.k} k={x.k} v={x.v} />
            ))}
          </dl>
        </div>

        {org ? (
          <div
            {...sx(
              {
                gridColumn: "1 / -1",
                padding: "16px 18px",
                borderRadius: 20,
                background: "linear-gradient(135deg,rgba(184,242,222,0.45),rgba(126,232,199,0.14))",
                boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.14)",
              },
              {
                background: "linear-gradient(135deg,rgba(126,232,199,0.1),rgba(5,64,57,0.35))",
                boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.22)",
              },
              s.up,
            )}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <h3 className={s.h3} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ic d={P.biz} size={18} />
                مسار الطلب الكبير · {CUSTOMER_TYPE[r.ctype]}
              </h3>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {bulkChips(r).map((t) => (
                  <span
                    key={t}
                    {...sx(
                      {
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        lineHeight: "20px",
                        fontWeight: 700,
                        background: "#ffffff",
                        color: "#005c58",
                        border: "1px solid rgba(0,92,88,0.25)",
                      },
                      {
                        background: "rgba(126,232,199,0.12)",
                        color: "#b8f2de",
                        border: "1px solid rgba(126,232,199,0.35)",
                      },
                    )}
                  >
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <StageRail r={r} />
            {r.next ? (
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span
                  {...sx(
                    {
                      flex: "1 1 220px",
                      fontSize: 14,
                      lineHeight: "22px",
                      fontWeight: 600,
                      color: "rgba(3,9,9,0.8)",
                    },
                    { color: "rgba(242,251,248,0.85)" },
                  )}
                >
                  {r.next.blocked
                    ? `المرحلة الحالية: ${STAGES[r.stage]}. ${r.next.blocked}`
                    : `المرحلة الحالية: ${STAGES[r.stage]}. لما تخلص، سجّلها وهيتجهز تحديث للعميل على واتساب.`}
                </span>
                <button
                  className={cn(s.btn, s.cta)}
                  type="button"
                  disabled={actions.busy || Boolean(r.next.blocked)}
                  onClick={() => actions.advance(r)}
                  style={{
                    minHeight: 44,
                    padding: "8px 20px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {r.next.label}
                </button>
              </div>
            ) : null}
            {waitQuote ? (
              <p {...note}>
                لسه ما اتبعتش عرض سعر. «موافقة» هنا معناها إنك هتبعت عرض السعر للعميل، والإنتاج مش
                هيبدأ غير بعد موافقته واعتماد الموكاب.
              </p>
            ) : null}
            {r.invoice ? (
              <p {...note}>العميل طالب فاتورة باسم الجهة. [نوع الفاتورة بانتظار تأكيد يوزرسيف]</p>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 className={s.h3}>الملفات</h3>
          {r.files.length === 0 ? (
            <p {...muted({ margin: 0, fontSize: 14, color: "rgba(3,9,9,0.65)" })}>
              مفيش ملفات مرفوعة.
            </p>
          ) : null}
          {r.files.map((f) => (
            <div key={f.id} style={block}>
              <FilePreview file={f} size={72} />
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span dir="ltr" {...value({ fontSize: 14, fontWeight: 700 })}>
                  {f.name}
                </span>
                {f.lowRes ? (
                  <span {...muted({ fontSize: 12, color: "rgba(3,9,9,0.65)" })}>
                    دقة الملف قليلة
                  </span>
                ) : null}
                <a
                  className={cn(s.btn, s.soft)}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={f.name}
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Ic d={P.download} size={16} />
                  تحميل
                </a>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 className={s.h3}>ملاحظات العميل</h3>
          <p
            {...sx(
              { margin: 0, fontSize: 15, lineHeight: "26px" },
              { color: "rgba(242,251,248,0.85)" },
            )}
          >
            {r.notes}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
          <label htmlFor="a-int" className={s.h3}>
            ملاحظة داخلية (مش بتظهر للعميل)
          </label>
          <textarea
            className={s.fld}
            id="a-int"
            rows={2}
            defaultValue={r.internalNote}
            disabled={!r.can.note}
            onBlur={(e) => {
              if (e.target.value.trim() !== r.internalNote.trim())
                actions.saveNote(r, e.target.value);
            }}
            style={{ lineHeight: "24px", resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: "1 / -1" }}>
          <h3 className={s.h3}>سجل النشاط</h3>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {r.log.map((l, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 14,
                  lineHeight: "22px",
                }}
              >
                <span
                  aria-hidden="true"
                  {...sx(
                    {
                      width: 10,
                      height: 10,
                      marginTop: 6,
                      flexShrink: 0,
                      borderRadius: 999,
                      background: "#7ee8c7",
                      boxShadow: "0 0 0 3px rgba(126,232,199,0.25), 0 0 8px rgba(126,232,199,0.7)",
                    },
                    {
                      boxShadow: "0 0 0 3px rgba(126,232,199,0.2), 0 0 8px rgba(126,232,199,0.7)",
                    },
                  )}
                />
                <time
                  {...sx(
                    { flexShrink: 0, minWidth: 140, color: "rgba(3,9,9,0.6)", fontWeight: 600 },
                    { color: "rgba(242,251,248,0.55)" },
                  )}
                >
                  {l.t}
                </time>
                <span {...sx({}, { color: "rgba(242,251,248,0.85)" })}>{l.m}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div
        {...sx(
          {
            marginTop: "auto",
            padding: "16px 22px",
            borderTop: "1px solid rgba(0,92,88,0.1)",
            background: "rgba(126,232,199,0.08)",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          },
          { borderTop: "1px solid rgba(126,232,199,0.12)", background: "rgba(126,232,199,0.04)" },
        )}
      >
        {isDecidable(r) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: "100%" }}>
            {r.can.approve ? (
              <button
                className={cn(s.btn, s.cta)}
                type="button"
                onClick={() => open("approve", r.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 48,
                  padding: "10px 26px",
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                <Ic d={P.ok} size={18} stroke={2.4} />
                موافقة
              </button>
            ) : null}
            {r.can.info ? (
              <button
                className={cn(s.btn, s.soft)}
                type="button"
                onClick={() => open("info", r.id)}
                style={{
                  minHeight: 48,
                  padding: "10px 22px",
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                طلب بيانات من العميل
              </button>
            ) : null}
            <span style={{ flexGrow: 1 }} />
            {r.can.reject ? (
              <button
                className={cn(s.btn, s.line)}
                type="button"
                onClick={() => open("reject", r.id)}
                style={{
                  minHeight: 48,
                  padding: "10px 22px",
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                رفض
              </button>
            ) : null}
          </div>
        ) : null}
        {isClosed(r) ? (
          <p {...muted({ margin: 0, fontSize: 14, color: "rgba(3,9,9,0.65)" })}>
            تم اتخاذ القرار في الطلب ده. أي تغيير هيتسجل في سجل النشاط.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Spec({ k, v, mobile = false }: { k: string; v: string; mobile?: boolean }) {
  return (
    <div
      {...sx(
        {
          padding: mobile ? "8px 10px" : "10px 14px",
          borderRadius: mobile ? 14 : 16,
          background: "linear-gradient(135deg,rgba(184,242,222,.4),rgba(126,232,199,.14))",
          boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.1)",
        },
        {
          background: "rgba(126,232,199,0.07)",
          boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.2)",
        },
      )}
    >
      <dt
        {...sx(
          { fontSize: mobile ? 11 : 12, fontWeight: 600, color: "rgba(3,9,9,0.6)" },
          { color: "rgba(242,251,248,0.58)" },
        )}
      >
        {k}
      </dt>
      <dd
        {...sx(
          { margin: 0, fontSize: mobile ? 14 : 15, fontWeight: 800, color: "#005c58" },
          { color: "#b8f2de" },
        )}
      >
        {v}
      </dd>
    </div>
  );
}

function StageRail({ r }: { r: Order }) {
  const st = r.stage;
  return (
    <ol
      aria-label="مراحل الطلب الكبير"
      style={{
        listStyle: "none",
        margin: "14px 0 0",
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 4,
      }}
    >
      {STAGES.map((label, i) => {
        const done = i < st;
        const cur =
          (i === st && r.status === "approved") ||
          (i === 0 && r.status !== "approved" && r.status !== "rejected");
        const dotBase: CSSProperties = {
          position: "relative",
          zIndex: 1,
          width: 30,
          height: 30,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
        };
        const dot = done
          ? sx({
              ...dotBase,
              background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
              color: "#01302d",
              boxShadow: "0 0 10px rgba(126,232,199,0.55)",
            })
          : cur
            ? sx(
                {
                  ...dotBase,
                  background: "#01302d",
                  color: "#7ee8c7",
                  border: "1.5px solid #7ee8c7",
                  boxShadow: "0 0 14px rgba(126,232,199,0.6)",
                },
                { background: "#001412" },
              )
            : sx(
                {
                  ...dotBase,
                  background: "#ffffff",
                  color: "rgba(3,9,9,0.45)",
                  border: "1px solid rgba(0,92,88,0.2)",
                },
                {
                  background: "rgba(242,251,248,0.06)",
                  color: "rgba(242,251,248,0.5)",
                  border: "1px solid rgba(242,251,248,0.2)",
                },
              );
        const text = sx(
          {
            fontSize: 12,
            lineHeight: "16px",
            fontWeight: cur ? 800 : 600,
            color: cur || done ? "#030909" : "rgba(3,9,9,0.55)",
          },
          { color: cur || done ? "#ffffff" : "rgba(242,251,248,0.55)" },
        );
        return (
          <li
            key={label}
            aria-current={cur ? "step" : undefined}
            aria-label={label + (done ? " (خلصت)" : cur ? " (الحالية)" : "")}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              textAlign: "center",
            }}
          >
            {i === 0 ? null : (
              <span
                aria-hidden="true"
                {...(i <= st
                  ? sx({
                      position: "absolute",
                      top: 14,
                      left: "50%",
                      width: "100%",
                      height: 2,
                      borderRadius: 2,
                      background: "#7ee8c7",
                      boxShadow: "0 0 8px rgba(126,232,199,0.7)",
                    })
                  : sx(
                      {
                        position: "absolute",
                        top: 14,
                        left: "50%",
                        width: "100%",
                        height: 2,
                        borderRadius: 2,
                        background: "rgba(0,92,88,0.15)",
                      },
                      { background: "rgba(126,232,199,0.15)" },
                    ))}
              />
            )}
            <span aria-hidden="true" {...dot}>
              {done ? "✓" : String(i + 1)}
            </span>
            <span aria-hidden="true" {...text}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ============================== Mobile (Admin-Mobile.html) ============================== */

export function OrdersMobile({ state, list, patch, open }: ViewProps) {
  const nNew = state.stats.new;
  const nOn = state.filter === "new";
  const aOn = state.filter === "awaiting";
  const card: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "12px 14px",
    borderRadius: 22,
    textAlign: "right",
    fontFamily: "inherit",
  };
  const iconBox: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const filters: [StatusFilter, string][] = FILTERS.map(([k, l]) => [
    k,
    k === "all" ? `الكل · ${state.orders.length}` : k === "new" ? `جديد · ${nNew}` : l,
  ]);

  return (
    <div className={s.m} style={{ position: "relative", isolation: "isolate" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/images/admin/ornament-teal.svg"
        alt=""
        aria-hidden="true"
        className={s.lightOnly}
        style={{
          position: "absolute",
          zIndex: -1,
          top: 520,
          left: -200,
          width: 420,
          height: 420,
          pointerEvents: "none",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, exact negative offsets */}
      <img
        src="/images/admin/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        className={cn(s.darkOnly, s.ornament)}
        style={{
          position: "absolute",
          zIndex: -1,
          top: 520,
          left: -200,
          width: 420,
          height: 420,
          opacity: 0.22,
          pointerEvents: "none",
        }}
      />
      <MobileHeader
        title={
          <>
            لوحة <Neon>الطلبات</Neon>
          </>
        }
        sub={
          <span
            {...sx(
              { fontSize: 12, color: "rgba(255,255,255,0.72)" },
              { color: "rgba(242,251,248,0.68)" },
            )}
          >
            راجع الطلبات واتخذ القرار
          </span>
        }
        action={
          <button className={cn(s.btn, s.icon, o.bell)} type="button" aria-label="الإشعارات">
            <Ic d={P.bell} size={20} />
          </button>
        }
      >
        <label
          style={{ position: "relative", display: "flex", alignItems: "center", marginTop: 12 }}
        >
          <span className={s.srOnly}>بحث في الطلبات</span>
          <Ic
            d={P.search}
            size={18}
            {...sx(
              { position: "absolute", right: 14, color: "rgba(255,255,255,0.7)" },
              { color: "rgba(242,251,248,0.6)" },
            )}
          />
          <input
            type="search"
            value={state.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="رقم الطلب أو اسم العميل"
            className={o.mSearch}
          />
        </label>
      </MobileHeader>

      <section
        className={s.up}
        aria-label="ملخص"
        style={{
          padding: "16px 16px 0",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => patch({ filter: nOn ? "all" : "new" })}
          aria-pressed={nOn}
          {...sx(
            {
              ...card,
              background:
                "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(0,92,88,0.95) 0%, rgba(0,92,88,0) 100%), #01302d",
              color: "#ffffff",
              border: nOn ? "2px solid #7ee8c7" : "1px solid rgba(126,232,199,0.45)",
              boxShadow: nOn ? "0 0 22px rgba(126,232,199,0.5)" : "0 0 18px rgba(126,232,199,0.2)",
            },
            {
              background:
                "radial-gradient(ellipse 90% 90% at 80% 0%, rgba(5,64,57,0.95) 0%, rgba(5,64,57,0) 100%), #032722",
              color: "#f2fbf8",
              boxShadow: nOn
                ? "0 0 22px rgba(126,232,199,0.45)"
                : "0 0 18px rgba(126,232,199,0.15)",
            },
            cn(s.btn, s.dk),
          )}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              {...sx(
                { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.82)" },
                { color: "rgba(242,251,248,0.8)" },
              )}
            >
              جديدة بانتظار المراجعة
            </span>
            <span
              aria-hidden="true"
              {...sx(
                {
                  ...iconBox,
                  background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
                  color: "#01302d",
                },
                { color: "#001412" },
              )}
            >
              <Ic d={P.inbox} size={16} />
            </span>
          </span>
          <strong {...sx({ fontSize: 30, lineHeight: "42px" }, { color: "#ffffff" })}>
            {nNew}
          </strong>
        </button>
        <button
          type="button"
          onClick={() => patch({ filter: aOn ? "all" : "awaiting" })}
          aria-pressed={aOn}
          {...sx(
            {
              ...card,
              color: "#030909",
              ...(aOn
                ? { border: "2px solid #00706a", boxShadow: "0 0 0 4px rgba(126,232,199,0.25)" }
                : null),
            },
            {
              color: "#f2fbf8",
              ...(aOn
                ? {
                    border: "2px solid #7ee8c7",
                    boxShadow: "0 0 0 4px rgba(126,232,199,0.15), 0 0 18px rgba(126,232,199,0.25)",
                  }
                : null),
            },
            cn(s.btn, s.glass),
          )}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              {...sx(
                { fontSize: 12, fontWeight: 700, color: "rgba(3,9,9,0.65)" },
                { color: "rgba(242,251,248,0.7)" },
              )}
            >
              بانتظار رد العميل
            </span>
            <span
              aria-hidden="true"
              {...sx(
                {
                  ...iconBox,
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
              )}
            >
              <Ic d={P.clock} size={16} />
            </span>
          </span>
          <strong {...sx({ fontSize: 30, lineHeight: "42px" }, { color: "#ffffff" })}>
            {state.stats.awaiting}
          </strong>
        </button>
      </section>

      <div
        className={cn(s.up, s.d1, s.strip)}
        role="group"
        aria-label="فلتر الحالة"
        style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 16px 6px" }}
      >
        {filters.map(([key, label]) => (
          <Chip
            key={key}
            on={state.filter === key}
            onClick={() => patch({ filter: key })}
            className={s.chipM}
          >
            {label}
          </Chip>
        ))}
      </div>

      <div
        className={cn(s.up, s.d2)}
        style={{ padding: "8px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}
      >
        {list.map((r) => (
          <MobileCard
            key={r.id}
            r={r}
            isOpen={r.id === state.openId}
            toggle={() => patch({ openId: r.id === state.openId ? "" : r.id })}
            open={open}
          />
        ))}
        {list.length === 0 ? (
          <div
            className={s.glass}
            style={{
              padding: "28px 16px",
              borderRadius: 22,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <strong>{state.orders.length ? "مفيش طلبات بالفلتر ده" : "لسه مفيش طلبات"}</strong>
            <button
              className={cn(s.btn, s.soft)}
              type="button"
              onClick={() => patch({ q: "", filter: "all" })}
              style={{ minHeight: 44, padding: "6px 18px", borderRadius: 999, fontWeight: 700 }}
            >
              امسح الفلاتر
            </button>
          </div>
        ) : null}
        <p
          {...sx(
            { margin: 0, textAlign: "center", fontSize: 13, color: "rgba(3,9,9,0.6)" },
            { color: "rgba(242,251,248,0.55)" },
          )}
        >
          عرض {list.length} من {state.orders.length} طلبات
        </p>
      </div>
    </div>
  );
}

function MobileCard({
  r,
  isOpen,
  toggle,
  open,
}: {
  r: Order;
  isOpen: boolean;
  toggle: () => void;
  open: ViewProps["open"];
}) {
  const st = STATUS[r.status];
  return (
    <article
      {...sx(
        {
          borderRadius: 22,
          overflow: "hidden",
          ...(isOpen
            ? {
                boxShadow:
                  "0 0 0 1.5px rgba(0,112,106,0.7), 0 0 22px rgba(126,232,199,0.35), 0 12px 28px rgba(0,92,88,0.14)",
              }
            : null),
        },
        isOpen
          ? {
              borderColor: "rgba(126,232,199,0.7)",
              boxShadow: "0 0 22px rgba(126,232,199,0.22), 0 14px 30px rgba(0,0,0,0.35)",
            }
          : {},
        s.glass,
      )}
    >
      <button
        className={s.cardBtn}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 12,
          border: 0,
          background: "transparent",
          color: "inherit",
          textAlign: "right",
          cursor: "pointer",
        }}
      >
        <Image
          width={52}
          height={52}
          src={orderImage(r)}
          alt=""
          {...sx(
            {
              width: 52,
              height: 52,
              borderRadius: 14,
              objectFit: "cover",
              flexShrink: 0,
              boxShadow: "0 0 0 1px rgba(0,92,88,0.12)",
            },
            { boxShadow: "0 0 0 1px rgba(126,232,199,0.25)" },
          )}
        />
        <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <strong {...sx({ fontSize: 15, lineHeight: "24px" }, { color: "#ffffff" })}>
            {r.name}
          </strong>
          <span
            {...sx(
              { fontSize: 12, lineHeight: "18px", color: "rgba(3,9,9,0.62)" },
              { color: "rgba(242,251,248,0.6)" },
            )}
          >
            {r.product} · {r.when}
          </span>
          <span
            dir="ltr"
            {...sx(
              {
                alignSelf: "flex-end",
                fontSize: 11,
                color: "rgba(3,9,9,0.5)",
                letterSpacing: ".5px",
              },
              { color: "rgba(242,251,248,0.45)" },
            )}
          >
            {r.ref}
          </span>
        </span>
        <span
          {...sx(
            {
              flexShrink: 0,
              alignSelf: "flex-start",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              lineHeight: "20px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              ...st.l,
            },
            { boxShadow: undefined, ...st.d },
          )}
        >
          {statusLabel(r)}
        </span>
      </button>
      {isOpen ? (
        <div
          className={s.fade}
          style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {r.specs.map((x) => (
              <Spec key={x.k} k={x.k} v={x.v} mobile />
            ))}
          </dl>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {r.files[0] ? (
              <FilePreview file={r.files[0]} size={48} />
            ) : (
              <FilePreview file={null} size={48} />
            )}
            <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              <span
                dir="ltr"
                {...sx({ fontSize: 13, fontWeight: 700, textAlign: "right" }, { color: "#ffffff" })}
              >
                {r.files[0]?.name ?? "مفيش ملفات مرفوعة"}
              </span>
              <span
                {...sx(
                  { fontSize: 12, color: "rgba(3,9,9,0.6)" },
                  { color: "rgba(242,251,248,0.58)" },
                )}
              >
                {r.receipt} · {r.date}
              </span>
            </span>
          </div>
          <p
            {...sx(
              { margin: 0, fontSize: 14, lineHeight: "22px", color: "rgba(3,9,9,0.78)" },
              { color: "rgba(242,251,248,0.8)" },
            )}
          >
            {r.notes}
          </p>
          {isDecidable(r) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
              {r.can.approve ? (
                <button
                  className={cn(s.btn, s.cta, s.cardBtn)}
                  type="button"
                  onClick={() => open("approve", r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    minHeight: 50,
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <Ic d={P.ok} size={18} stroke={2.4} />
                  موافقة…
                </button>
              ) : null}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {r.can.info ? (
                  <button
                    className={cn(s.btn, s.soft, s.cardBtn)}
                    type="button"
                    onClick={() => open("info", r.id)}
                    style={{ minHeight: 46, borderRadius: 999, fontSize: 14, fontWeight: 700 }}
                  >
                    طلب بيانات
                  </button>
                ) : null}
                {r.can.reject ? (
                  <button
                    className={cn(s.btn, s.line, s.cardBtn)}
                    type="button"
                    onClick={() => open("reject", r.id)}
                    style={{ minHeight: 46, borderRadius: 999, fontSize: 14, fontWeight: 700 }}
                  >
                    رفض…
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {isClosed(r) ? (
            <p
              {...sx(
                {
                  margin: 0,
                  padding: "8px 12px",
                  borderRadius: 14,
                  background: "rgba(126,232,199,0.14)",
                  fontSize: 13,
                  color: "rgba(3,9,9,0.7)",
                },
                { background: "rgba(126,232,199,0.08)", color: "rgba(242,251,248,0.68)" },
              )}
            >
              تم اتخاذ القرار في الطلب ده.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * A file's thumbnail: the image itself for pictures (a remote blob of unknown size), the design's
 * generic preview otherwise.
 */
function FilePreview({ file, size }: { file: Order["files"][number] | null; size: number }) {
  const look = sx(
    {
      width: size,
      height: size,
      objectFit: file?.isImage ? "cover" : "contain",
      borderRadius: size > 60 ? 16 : 12,
      background: "#ffffff",
      boxShadow:
        size > 60
          ? "0 0 0 1px rgba(0,92,88,0.14), 0 6px 14px rgba(0,92,88,0.1)"
          : "0 0 0 1px rgba(0,92,88,0.14)",
    },
    {
      background: "#f2fbf8",
      boxShadow:
        size > 60
          ? "0 0 0 1px rgba(126,232,199,0.35), 0 0 14px rgba(126,232,199,0.15)"
          : "0 0 0 1px rgba(126,232,199,0.35)",
    },
  );
  if (file?.isImage && file.url) {
    // eslint-disable-next-line @next/next/no-img-element -- customer upload on Vercel Blob, size unknown
    return <img src={file.url} alt={`معاينة ${file.name}`} {...look} />;
  }
  return (
    <Image
      width={size}
      height={size}
      src="/images/admin/file-preview.png"
      alt="معاينة ملف التصميم"
      {...look}
    />
  );
}
