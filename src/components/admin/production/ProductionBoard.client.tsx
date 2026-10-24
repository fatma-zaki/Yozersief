"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  piecePrintedAction,
  printedCountAction,
  productionStepAction,
  qcCheckAction,
} from "@/app/(dashboard)/dashboard/production/actions";
import { cn } from "@/lib/cn";
import type { ProductionCard, ProductionData } from "@/modules/orders";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import { orderImage } from "../orders/data";
import d from "../team-kit.module.css";

type Column = ProductionCard["column"];
type QcKey = keyof ProductionCard["qc"];

const COLS: [Column, string][] = [
  ["queue", "جاهز للطباعة"],
  ["print", "بيتطبع"],
  ["qc", "فحص الجودة"],
  ["ready", "جاهز للتسليم"],
];
const QC: [QcKey, string][] = [
  ["qcSizesOk", "المقاسات مطابقة"],
  ["qcNamesOk", "الأسماء مظبوطة"],
  ["qcPrintOk", "الطباعة واضحة"],
  ["qcCountOk", "العدد كامل"],
];
const STEP = {
  queue: ["start", "ابدأ الطباعة"],
  print: ["finish", "خلص — للفحص"],
  qc: ["pass", "الفحص تمام"],
} as const;

function Check({
  on,
  label,
  onToggle,
  disabled,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(d.cbx, on ? d.cbxOn : d.cbxOff)}
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
    >
      <Ic d={P.ok} size={14} stroke={3} />
    </button>
  );
}

/**
 * The production board (brief B10), from docs/design/Team-Production.html: four columns from
 * «جاهز للطباعة» to «جاهز للتسليم», the press counter, the QC checklist and the names sheet.
 * Counter and checks update on the spot and are saved one by one.
 */
export function ProductionBoard({ data }: { data: ProductionData }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [printed, setPrinted] = useState<Record<string, number>>({});
  const [qc, setQc] = useState<Record<string, ProductionCard["qc"]>>({});
  const [pieces, setPieces] = useState<Record<number, boolean>>({});
  const { toast, flash, hide } = useFlash();

  const countOf = (c: ProductionCard) => printed[c.id] ?? c.printed;
  const qcOf = (c: ProductionCard) => qc[c.id] ?? c.qc;

  const count = (c: ProductionCard, next: number) => {
    const value = Math.min(Math.max(0, next), c.quantity);
    const before = countOf(c);
    if (value === before) return;
    setPrinted((m) => ({ ...m, [c.id]: value }));
    void printedCountAction({ orderId: c.id, count: value }).then((r) => {
      if (!r.ok) {
        setPrinted((m) => ({ ...m, [c.id]: before }));
        flash(r.error);
      }
    });
  };

  const toggleQc = (c: ProductionCard, key: QcKey) => {
    const before = qcOf(c);
    const on = !before[key];
    setQc((m) => ({ ...m, [c.id]: { ...before, [key]: on } }));
    void qcCheckAction({ orderId: c.id, key, on }).then((r) => {
      if (!r.ok) {
        setQc((m) => ({ ...m, [c.id]: before }));
        flash(r.error);
      }
    });
  };

  const step = (c: ProductionCard) => {
    if (c.column === "ready") return;
    const column = c.column;
    const [kind] = STEP[column];
    startTransition(async () => {
      const r = await productionStepAction(kind, { orderId: c.id });
      if (!r.ok) {
        flash(r.error);
        return;
      }
      const to = { queue: "بيتطبع", print: "فحص الجودة", qc: "" }[column];
      flash(to ? `${c.ref} اتنقل لـ «${to}»` : `${c.ref} جاهز — اتبلغ مسؤول التسليم والعميل`);
      router.refresh();
    });
  };

  const togglePiece = (id: number, before: boolean) => {
    setPieces((m) => ({ ...m, [id]: !before }));
    void piecePrintedAction({ pieceId: id, printed: !before }).then((r) => {
      if (!r.ok) {
        setPieces((m) => ({ ...m, [id]: before }));
        flash(r.error);
      }
    });
  };

  const sheet = data.sheet;
  const sheetDone = sheet ? sheet.pieces.filter((p) => pieces[p.id] ?? p.printed).length : 0;

  return (
    <div className={k.root}>
      <KitHeader
        title="لوحة الإنتاج"
        subtitle="الطلبات اللي اتعمدت ودفعت العربون، من الطباعة لحد ما تبقى جاهزة للتسليم"
      />

      <div className={cn(d.lockrow, s.up, s.d1)}>
        <Ic d={P.eyeOff} size={18} />
        <span>
          الأسعار وبيانات تواصل العملاء مخفية عن دور الإنتاج. اللي ظاهر: المواصفات، الكميات،
          والملفات النهائية المعتمدة.
        </span>
      </div>

      <section
        aria-label="مراحل الإنتاج"
        className={cn(s.up, s.d2, d.board)}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {COLS.map(([col, label]) => {
          const cards = data.cards.filter((c) => c.column === col);
          return (
            <div key={col} className={d.kcol}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "2px 4px",
                }}
              >
                <h2 className={k.h2} style={{ fontSize: 15 }}>
                  {label}
                </h2>
                <span className={cn(k.badge, k.bRole)}>{cards.length}</span>
              </div>
              {cards.map((c) => {
                const done = countOf(c);
                const pct = Math.round((done / c.quantity) * 100);
                const checks = qcOf(c);
                const allQc = QC.every(([key]) => checks[key]);
                const blocked =
                  (c.column === "queue" && !!c.blocked) ||
                  (c.column === "print" && done < c.quantity) ||
                  (c.column === "qc" && !allQc);
                return (
                  <article
                    key={c.id}
                    className={cn(k.card, s.pop)}
                    style={{
                      padding: 12,
                      borderRadius: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- 42px thumb, as in the design */}
                      <img
                        src={orderImage(c)}
                        alt=""
                        style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }}
                      />
                      <span
                        style={{
                          flexGrow: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <strong style={{ fontSize: 14, color: "var(--ink-strong)" }}>
                          {c.product}
                        </strong>
                        <span
                          dir="ltr"
                          className={k.muted}
                          style={{ fontSize: 11, textAlign: "right" }}
                        >
                          {c.ref}
                        </span>
                      </span>
                    </div>
                    {c.spec ? (
                      <span className={k.muted} style={{ fontSize: 12, lineHeight: "18px" }}>
                        {c.spec}
                      </span>
                    ) : null}
                    {c.column === "print" || c.column === "qc" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <span>
                            اتطبع {done} من {c.quantity}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div
                          className={d.barp}
                          role="progressbar"
                          aria-label={`تقدم ${c.ref}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                        >
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : null}
                    {c.column === "print" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className={cn(k.btn, k.soft)}
                          type="button"
                          onClick={() => count(c, done - 1)}
                          aria-label={`قلّل قطعة من ${c.ref}`}
                          style={{ width: 40, height: 40, borderRadius: 12, fontSize: 18 }}
                        >
                          −
                        </button>
                        <button
                          className={cn(k.btn, k.soft)}
                          type="button"
                          onClick={() => count(c, done + 1)}
                          aria-label={`زوّد قطعة على ${c.ref}`}
                          style={{ width: 40, height: 40, borderRadius: 12, fontSize: 18 }}
                        >
                          +
                        </button>
                        <button
                          className={cn(k.btn, k.soft)}
                          type="button"
                          onClick={() => count(c, done + 10)}
                          style={{ height: 40, padding: "0 12px", borderRadius: 12, fontSize: 13 }}
                        >
                          +10
                        </button>
                      </div>
                    ) : null}
                    {c.column === "qc" ? (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: 0,
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {QC.map(([key, text]) => (
                          <li
                            key={key}
                            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                          >
                            <Check
                              on={checks[key]}
                              label={text}
                              onToggle={() => toggleQc(c, key)}
                            />
                            {text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {c.column === "queue" && c.blocked ? (
                      <span className={k.muted} style={{ fontSize: 12, lineHeight: "18px" }}>
                        {c.blocked}
                      </span>
                    ) : null}
                    {c.column !== "ready" ? (
                      <button
                        className={cn(k.btn, k.cta)}
                        type="button"
                        onClick={() => step(c)}
                        disabled={blocked || busy}
                        style={{ minHeight: 40, borderRadius: 999, fontSize: 13 }}
                      >
                        {STEP[c.column][1]}
                      </button>
                    ) : (
                      <span className={cn(k.badge, k.bOk)} style={{ alignSelf: "flex-start" }}>
                        اتنقل لمسؤول التسليم
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>

      {sheet ? (
        <section
          className={cn(k.card, s.up, s.d3)}
          aria-labelledby="sh-h"
          style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <h2 id="sh-h" className={k.h2}>
              شيت الأسماء — {sheet.title}{" "}
              <span dir="ltr" className={k.muted} style={{ fontSize: 12 }}>
                {sheet.ref}
              </span>
            </h2>
            {sheet.pieces.length ? (
              <span className={k.muted} style={{ fontSize: 12 }}>
                علّم كل قطعة لما تتطبع · {sheetDone} من {sheet.pieces.length}
              </span>
            ) : null}
          </div>
          {sheet.pieces.length ? (
            <div
              className={k.twoM}
              style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}
            >
              {sheet.pieces.map((p) => {
                const on = pieces[p.id] ?? p.printed;
                return (
                  <div
                    key={p.id}
                    className={k.tint}
                    style={{
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <Check
                      on={on}
                      label={`اتطبعت قطعة ${p.name}`}
                      onToggle={() => togglePiece(p.id, on)}
                    />
                    <span style={{ flexGrow: 1 }}>{p.name}</span>
                    {p.size ? <span className={cn(k.badge, k.bRole)}>{p.size}</span> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={d.waNote} style={{ margin: 0 }}>
              الأسماء لسه ما اتسجلتش قطعة قطعة.{" "}
              {sheet.sheetUrl ? (
                <a href={sheet.sheetUrl} target="_blank" rel="noopener noreferrer">
                  افتح الشيت اللي العميل رفعه
                </a>
              ) : (
                "العميل ما رفعش شيت أسماء."
              )}
            </p>
          )}
        </section>
      ) : null}
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}
