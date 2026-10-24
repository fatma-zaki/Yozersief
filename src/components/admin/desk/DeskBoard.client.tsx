"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  customerWhatsappAction,
  draftQuoteAction,
  forwardToAdminAction,
  mockupDecisionAction,
  requestInfoAction,
  sendMockupAction,
} from "@/app/(dashboard)/dashboard/desk/actions";
import { cn } from "@/lib/cn";
import type { DeskData, DeskOrderView, DeskState } from "@/modules/orders";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import { orderImage } from "../orders/data";
import { DecisionDialog } from "../orders/DecisionDialog.client";
import d from "../team-kit.module.css";

type Filter = "all" | "org" | "person";

const FILTERS: [Filter, string][] = [
  ["all", "الكل"],
  ["org", "شركات وجهات"],
  ["person", "أفراد"],
];

const STATE: Record<DeskState, [string, string | undefined]> = {
  new: ["جديد", k.bOk],
  awaiting: ["بانتظار العميل", k.bWarn],
  pending: ["بانتظار المدير", k.bRole],
  mockup: ["موكاب جاهز", k.bOk],
  mockup_sent: ["الموكاب لدى العميل", k.bWarn],
};

const WHO: Record<DeskOrderView["ctype"], string> = {
  person: "فرد",
  biz: "شركة",
  group: "فريق أو جهة",
};

const isOrg = (o: DeskOrderView) => o.ctype !== "person";
const EMPTY_QUOTE = { unit: "", total: "", days: "" };

/**
 * The desk workspace (brief B10), from docs/design/Team-Desk.html: the undecided orders, a quote
 * draft that goes to the admin for approval, forwarding, and asking the customer for details.
 * It also hands the designer's mockups to the customer and records their answer (B3 step 5),
 * which the design leaves out. Final decisions and prices stay with the admin.
 */
export function DeskBoard({ data, canPhone }: { data: DeskData; canPhone: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [selId, setSelId] = useState(data.orders[0]?.id ?? "");
  const [q, setQ] = useState(EMPTY_QUOTE);
  const [qErr, setQErr] = useState("");
  const [info, setInfo] = useState(false);
  const [infoErr, setInfoErr] = useState("");
  const [wa, setWa] = useState("");
  const { toast, flash, hide } = useFlash();

  const list = data.orders.filter(
    (o) => filter === "all" || (filter === "org" ? isOrg(o) : !isOrg(o)),
  );
  const sel = data.orders.find((o) => o.id === selId) ?? data.orders[0];

  const pick = (id: string) => {
    setSelId(id);
    setQ(EMPTY_QUOTE);
    setQErr("");
  };
  const done = (text: string, link = "") => {
    setWa(link);
    flash(text);
    router.refresh();
  };

  const sendQuote = (e: FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    if (!q.unit.trim() || !q.total.trim() || !q.days.trim()) {
      setQErr("اكتب سعر القطعة والإجمالي والمدة.");
      return;
    }
    startTransition(async () => {
      const result = await draftQuoteAction({
        orderId: sel.id,
        unitPrice: q.unit,
        total: q.total,
        leadTimeDays: q.days,
      });
      if (!result.ok) {
        const f = result.fieldErrors;
        setQErr(f?.unitPrice?.[0] ?? f?.total?.[0] ?? f?.leadTimeDays?.[0] ?? result.error);
        return;
      }
      setQ(EMPTY_QUOTE);
      done("أُرسلت مسودة عرض السعر إلى المدير لاعتمادها");
    });
  };

  const forward = () => {
    if (!sel) return;
    startTransition(async () => {
      const result = await forwardToAdminAction({ orderId: sel.id });
      if (!result.ok) flash(result.error);
      else done("حُوّل الطلب إلى المدير للموافقة");
    });
  };

  const askInfo = (text: string) => {
    if (!sel) return;
    setInfoErr("");
    startTransition(async () => {
      const result = await requestInfoAction({ orderId: sel.id, text });
      if (!result.ok) {
        setInfoErr(result.error);
        return;
      }
      setInfo(false);
      done(
        result.data.waLink
          ? "سُجّل طلب البيانات — رسالة واتساب جاهزة"
          : "سُجّل طلب البيانات من العميل",
        result.data.waLink ?? "",
      );
    });
  };

  // The tab opens on the click itself (popup blockers), then goes to the logged wa.me link.
  const openWhatsapp = () => {
    if (!sel) return;
    const tab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await customerWhatsappAction({ orderId: sel.id });
      if (!result.ok) {
        tab?.close();
        flash(result.error);
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = result.data.waLink;
      } else window.location.href = result.data.waLink;
    });
  };

  const sendMockup = () => {
    if (!sel) return;
    startTransition(async () => {
      const result = await sendMockupAction({ orderId: sel.id });
      if (!result.ok) flash(result.error);
      else done(`أُرسل الموكاب إلى عميل ${result.data.ref}`, result.data.waLink ?? "");
    });
  };

  const decideMockup = (decision: "approve" | "changes", feedback: string) => {
    if (!sel) return;
    startTransition(async () => {
      const result = await mockupDecisionAction({ orderId: sel.id, decision, feedback });
      if (!result.ok) {
        flash(result.fieldErrors?.feedback?.[0] ?? result.error);
        return;
      }
      done(
        decision === "approve"
          ? `سُجّل اعتماد الموكاب لـ ${result.data.ref} — يتبقى العربون`
          : "سُجّلت التعديلات وأُعيدت إلى المصمم",
        result.data.waLink ?? "",
      );
    });
  };

  const stats = [
    { label: "طلبات جديدة", n: data.stats.new, sub: "تحتاج إلى مراجعة أولية" },
    { label: "بانتظار رد العميل", n: data.stats.awaiting, sub: "طُلبت منهم بيانات" },
    { label: "بانتظار اعتماد المدير", n: data.stats.pending, sub: "عروض أسعار وموافقات" },
    {
      label: "متوسط أول رد",
      n: data.stats.firstResponse ?? "[—]",
      sub: data.stats.firstResponse ? "آخر 30 يومًا" : "لا توجد ردود في آخر 30 يومًا",
    },
  ];

  return (
    <div className={k.root}>
      <KitHeader
        title="استقبال الطلبات"
        subtitle="راجع الطلبات الجديدة، تواصل مع العملاء، وجهّز عروض الأسعار للمدير"
      />

      <section
        aria-label="ملخص"
        className={cn(s.up, s.d1, k.twoM)}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}
      >
        {stats.map((t) => (
          <div key={t.label} className={cn(k.card, d.stat)}>
            <span className={k.muted} style={{ fontSize: 13, fontWeight: 700 }}>
              {t.label}
            </span>
            <strong style={{ fontSize: 32, lineHeight: "44px", color: "var(--ink-strong)" }}>
              {t.n}
            </strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              {t.sub}
            </span>
          </div>
        ))}
      </section>

      <div
        className={k.stackM}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          className={cn(k.card, s.up, s.d2)}
          aria-labelledby="q-h"
          style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 6px",
            }}
          >
            <h2 id="q-h" className={k.h2}>
              الطلبات المسندة إليك
            </h2>
            <div role="group" aria-label="فلتر" style={{ display: "flex", gap: 6 }}>
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  className={d.chip}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.length ? (
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
              {list.map((o) => (
                <li key={o.id}>
                  <button
                    className={d.rowb}
                    type="button"
                    aria-current={o.id === sel?.id}
                    onClick={() => pick(o.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 46px thumb, as in the design */}
                    <img
                      src={orderImage(o)}
                      alt=""
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
                    >
                      <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <strong style={{ fontSize: 15, color: "var(--ink-strong)" }}>
                          {o.name}
                        </strong>
                        <span dir="ltr" className={k.muted} style={{ fontSize: 11 }}>
                          {o.ref}
                        </span>
                      </span>
                      <span className={k.muted} style={{ fontSize: 13 }}>
                        {o.org || WHO[o.ctype]} · {o.product}
                      </span>
                    </span>
                    <span className={cn(k.badge, STATE[o.desk][1])}>{STATE[o.desk][0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={k.muted} style={{ margin: 0, padding: "18px 6px", fontSize: 14 }}>
              {data.orders.length
                ? "لا توجد طلبات تطابق هذا الفلتر."
                : "لا توجد طلبات مسندة إليك حاليًا. ستظهر الطلبات الجديدة هنا فور وصولها."}
            </p>
          )}
        </section>

        {sel ? (
          <Detail
            key={sel.id}
            sel={sel}
            canPhone={canPhone}
            busy={busy}
            q={q}
            setQ={(patch) => {
              setQ((cur) => ({ ...cur, ...patch }));
              setQErr("");
            }}
            qErr={qErr}
            onQuote={sendQuote}
            onForward={forward}
            onInfo={() => {
              setInfoErr("");
              setInfo(true);
            }}
            onWhatsapp={openWhatsapp}
            onSendMockup={sendMockup}
            onMockupDecision={decideMockup}
          />
        ) : null}
      </div>

      {info && sel ? (
        <DecisionDialog
          dialog={{ kind: "info", id: sel.id, mobile: false }}
          order={sel}
          templates={data.templates}
          trackUrl={data.trackUrl}
          saving={busy}
          error={infoErr}
          onClose={() => setInfo(false)}
          onConfirm={(text) => askInfo(text)}
        />
      ) : null}

      <KitToast
        text={toast}
        onClose={() => {
          hide();
          setWa("");
        }}
      >
        {wa ? (
          <a
            className={cn(k.btn, k.cta)}
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0, minHeight: 38, padding: "4px 14px", borderRadius: 999 }}
          >
            <Ic d={P.chat} size={16} />
            افتح واتساب
          </a>
        ) : null}
      </KitToast>
    </div>
  );
}

function Detail({
  sel,
  canPhone,
  busy,
  q,
  setQ,
  qErr,
  onQuote,
  onForward,
  onInfo,
  onWhatsapp,
  onSendMockup,
  onMockupDecision,
}: {
  sel: DeskOrderView;
  canPhone: boolean;
  busy: boolean;
  q: typeof EMPTY_QUOTE;
  setQ: (patch: Partial<typeof EMPTY_QUOTE>) => void;
  qErr: string;
  onQuote: (e: FormEvent) => void;
  onForward: () => void;
  onInfo: () => void;
  onWhatsapp: () => void;
  onSendMockup: () => void;
  onMockupDecision: (decision: "approve" | "changes", feedback: string) => void;
}) {
  const pending = sel.desk === "pending";
  const atMockup = sel.desk === "mockup" || sel.desk === "mockup_sent";
  const showQuote = isOrg(sel) && !pending && !atMockup;
  const canForward = !isOrg(sel) && sel.desk === "new";
  const field = (id: string, label: string, key: keyof typeof EMPTY_QUOTE, ph: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className={k.lbl} htmlFor={id}>
        {label}
      </label>
      <input
        className={k.fld}
        id={id}
        type="text"
        inputMode={key === "days" ? "numeric" : "decimal"}
        value={q[key]}
        onChange={(e) => setQ({ [key]: e.target.value })}
        placeholder={ph}
        aria-invalid={qErr && !q[key].trim() ? true : undefined}
      />
    </div>
  );

  return (
    <section
      className={cn(k.card, s.up, s.d3)}
      aria-labelledby="dt-h"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <div
        className={d.dk}
        style={{
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          padding: "18px 20px",
          background: "var(--side-bg)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div className={d.sideGlow} aria-hidden="true" />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <span
            dir="ltr"
            className={d.neon}
            style={{ alignSelf: "flex-end", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}
          >
            {sel.ref}
          </span>
          <h2 id="dt-h" style={{ margin: 0, fontSize: 22, lineHeight: "32px", fontWeight: 800 }}>
            {sel.product}
          </h2>
        </div>
        <span className={d.who}>{WHO[sel.ctype]}</span>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          className={k.stackM}
          style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
        >
          <div
            className={k.tint}
            style={{ padding: "12px 14px", display: "flex", flexDirection: "column" }}
          >
            <span className={k.muted} style={{ fontSize: 12, fontWeight: 700 }}>
              العميل
            </span>
            <strong style={{ color: "var(--ink-strong)" }}>{sel.name}</strong>
            {sel.org ? (
              <span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 700 }}>
                {sel.org}
              </span>
            ) : null}
          </div>
          <div
            className={k.tint}
            style={{ padding: "12px 14px", display: "flex", flexDirection: "column" }}
          >
            <span className={k.muted} style={{ fontSize: 12, fontWeight: 700 }}>
              الهاتف{" "}
              {canPhone ? (
                <span className={cn(k.badge, k.bOk)} style={{ marginInlineStart: 4 }}>
                  ظاهر لدورك
                </span>
              ) : (
                <span className={cn(k.badge, k.bOff)} style={{ marginInlineStart: 4 }}>
                  مخفي لدورك
                </span>
              )}
            </span>
            {canPhone ? (
              <button
                type="button"
                dir="ltr"
                className={d.linkBtn}
                onClick={onWhatsapp}
                disabled={busy}
                aria-label={`واتساب العميل ${sel.phone}`}
                style={{ alignSelf: "flex-end" }}
              >
                {sel.phone}
              </button>
            ) : (
              <span dir="ltr" style={{ alignSelf: "flex-end", fontWeight: 800 }}>
                {sel.phone}
              </span>
            )}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 14, lineHeight: "24px", whiteSpace: "pre-line" }}>
          <strong>ملاحظات العميل:</strong> {sel.notes || "لا توجد ملاحظات."}
        </p>

        {sel.mockup ? (
          <MockupPanel sel={sel} busy={busy} onSend={onSendMockup} onDecision={onMockupDecision} />
        ) : null}

        {pending ? (
          <div
            className={cn(k.tint, s.pop)}
            style={{ padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}
          >
            <span className={k.tile} aria-hidden="true" style={{ width: 38, height: 38 }}>
              <Ic d={P.clock} size={18} />
            </span>
            <span style={{ fontSize: 14, lineHeight: "22px" }}>
              <strong style={{ color: "var(--ink-strong)" }}>بانتظار اعتماد المدير.</strong> سيصلك
              إشعار عند اعتماده، ثم تُرسل الرسالة إلى العميل.
            </span>
          </div>
        ) : null}

        {showQuote ? (
          <form
            onSubmit={onQuote}
            noValidate
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid var(--tint-bd)",
            }}
          >
            <h3 className={k.h2} style={{ fontSize: 15 }}>
              مسودة عرض السعر{" "}
              <span className={k.muted} style={{ fontWeight: 500, fontSize: 12 }}>
                (تُرسل إلى المدير لاعتمادها)
              </span>
            </h3>
            <div
              className={k.stackM}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}
            >
              {field("q-u", "سعر القطعة", "unit", "[السعر]")}
              {field("q-t", "الإجمالي", "total", "[الإجمالي]")}
              {field("q-d", "مدة التنفيذ", "days", "[المدة]")}
            </div>
            {qErr ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: "var(--warn-bg)",
                  border: "1px solid var(--warn-bd)",
                  color: "var(--warn-ink)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {qErr}
              </p>
            ) : null}
            <button
              className={cn(k.btn, k.cta)}
              type="submit"
              disabled={busy}
              style={{
                alignSelf: "flex-start",
                minHeight: 46,
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 14,
              }}
            >
              <Ic d={P.sent} size={18} />
              أرسل إلى المدير للاعتماد
            </button>
          </form>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {canForward ? (
            <button
              className={cn(k.btn, k.cta)}
              type="button"
              onClick={onForward}
              disabled={busy}
              style={{ minHeight: 44, padding: "6px 18px", borderRadius: 999, fontSize: 14 }}
            >
              حوّل إلى المدير للموافقة
            </button>
          ) : null}
          {sel.can.info && !atMockup ? (
            <button
              className={cn(k.btn, k.soft)}
              type="button"
              onClick={onInfo}
              disabled={busy}
              style={{ minHeight: 44, padding: "6px 18px", borderRadius: 999, fontSize: 14 }}
            >
              طلب بيانات من العميل
            </button>
          ) : null}
          {canPhone ? (
            <button
              className={cn(k.btn, k.soft)}
              type="button"
              onClick={onWhatsapp}
              disabled={busy}
              style={{ minHeight: 44, padding: "6px 18px", borderRadius: 999, fontSize: 14 }}
            >
              <Ic d={P.chat} size={16} />
              واتساب العميل
            </button>
          ) : null}
        </div>
        <div className={d.lockrow}>
          <Ic d={P.lock} size={18} />
          <span>
            <strong>الموافقة النهائية والرفض والأسعار</strong> من صلاحيات المدير فقط. دورك هو
            التجهيز والتحويل.
          </span>
        </div>
      </div>
    </section>
  );
}

/** The designer's latest mockup: send it to the customer, then record their answer. */
function MockupPanel({
  sel,
  busy,
  onSend,
  onDecision,
}: {
  sel: DeskOrderView;
  busy: boolean;
  onSend: () => void;
  onDecision: (decision: "approve" | "changes", feedback: string) => void;
}) {
  const [changes, setChanges] = useState(false);
  const [feedback, setFeedback] = useState("");
  const m = sel.mockup;
  if (!m) return null;
  const sent = sel.desk === "mockup_sent";
  const pill = { minHeight: 44, padding: "6px 18px", borderRadius: 999, fontSize: 14 };
  return (
    <div
      className={cn(k.tint, s.pop)}
      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {m.isImage ? (
          <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- mockup via our file route */}
            <img
              src={m.url}
              alt={`موكاب نسخة ${m.version}`}
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                objectFit: "cover",
                display: "block",
              }}
            />
          </a>
        ) : null}
        <span style={{ flexGrow: 1, fontSize: 14, lineHeight: "22px" }}>
          <strong style={{ color: "var(--ink-strong)" }}>
            {sent
              ? `الموكاب نسخة ${m.version} لدى العميل.`
              : `رفع المصمم الموكاب نسخة ${m.version}.`}
          </strong>{" "}
          {sent ? "سجّل رد العميل عندما يصلك عبر واتساب." : "راجعه وأرسله إلى العميل لاعتماده."}{" "}
          <a href={m.url} target="_blank" rel="noopener noreferrer" dir="ltr">
            {m.fileName}
          </a>
        </span>
      </div>
      {sent ? (
        changes ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className={k.lbl} htmlFor="mk-f">
              التعديلات التي طلبها العميل
            </label>
            <textarea
              id="mk-f"
              className={k.fld}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ minHeight: 84, resize: "vertical" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                className={cn(k.btn, k.cta)}
                type="button"
                disabled={busy}
                onClick={() => onDecision("changes", feedback)}
                style={pill}
              >
                أعده إلى المصمم مع التعديلات
              </button>
              <button
                className={cn(k.btn, k.soft)}
                type="button"
                onClick={() => setChanges(false)}
                style={pill}
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              className={cn(k.btn, k.cta)}
              type="button"
              disabled={busy}
              onClick={() => onDecision("approve", "")}
              style={pill}
            >
              العميل وافق على الموكاب
            </button>
            <button
              className={cn(k.btn, k.soft)}
              type="button"
              onClick={() => setChanges(true)}
              style={pill}
            >
              العميل طلب تعديل
            </button>
          </div>
        )
      ) : (
        <button
          className={cn(k.btn, k.cta)}
          type="button"
          disabled={busy}
          onClick={onSend}
          style={{ ...pill, alignSelf: "flex-start" }}
        >
          <Ic d={P.sent} size={16} />
          أرسل الموكاب إلى العميل
        </button>
      )}
    </div>
  );
}
