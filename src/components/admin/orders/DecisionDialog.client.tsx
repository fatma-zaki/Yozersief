"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { sx } from "../theme";
import type { Order } from "./data";
import { dialogSpec, isOrg, previewMessage } from "./logic";
import type { Dialog, ToastState } from "./OrdersBoard.client";
import o from "./orders.module.css";

/**
 * Approve / request info / reject (brief B7): a centred dialog on desktop (Admin.html), a bottom
 * sheet on phones (Admin-Mobile.html). Approving can prepare the WhatsApp message (brief B8).
 */
export function DecisionDialog({
  dialog,
  order: r,
  templates,
  trackUrl,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  dialog: Dialog;
  order: Order;
  templates: Record<string, string>;
  trackUrl: string;
  saving: boolean;
  /** The server's message when the decision did not go through (nothing was changed). */
  error: string;
  onClose: () => void;
  onConfirm: (text: string, sendWa: boolean) => void;
}) {
  const { kind, mobile } = dialog;
  const spec = dialogSpec(kind, r, mobile);
  const isApprove = kind === "approve";
  // Approving an organisation order starts from the desk's quote draft, when there is one.
  const [text, setText] = useState(isApprove && isOrg(r) ? (r.quoteDraft ?? "") : "");
  const [err, setErr] = useState("");
  const [waOn, setWaOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const ids = useId();
  const hId = `${ids}-h`;
  const tId = `${ids}-t`;

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // On open: focus the title (approve, phone sheet) or the text field, as the design does;
  // Escape closes; focus goes back to the button that opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const target = isApprove || mobile ? headingRef.current : textRef.current;
    target?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [isApprove, mobile]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spec.required && text.trim().length < 5) {
      setErr("اكتب سببًا واضحًا (5 أحرف على الأقل).");
      return;
    }
    if (saving) return;
    onConfirm(text, isApprove && waOn);
  };

  const confirmLabel = saving
    ? "جارٍ الحفظ…"
    : isApprove && waOn
      ? "موافقة وإرسال على واتساب"
      : spec.button;
  const waText = previewMessage(templates, kind, r, text, trackUrl);
  const url = trackUrl;
  const saveError = error ? (
    <p
      role="alert"
      {...sx(
        {
          margin: 0,
          padding: "10px 14px",
          borderRadius: 16,
          background: "#fbf6ec",
          border: "1px solid rgba(184,134,43,0.7)",
          fontSize: mobile ? 13 : 14,
          fontWeight: 700,
        },
        { background: "rgba(214,174,98,0.12)", border: "1px solid rgba(214,174,98,0.7)" },
      )}
    >
      {error}
    </p>
  ) : null;

  const waCheck = waOn
    ? sx(
        {
          background: "linear-gradient(135deg,rgba(184,242,222,.6),rgba(126,232,199,.22))",
          boxShadow: "0 0 0 1px rgba(0,92,88,0.25)",
        },
        {
          background: "linear-gradient(180deg,rgba(126,232,199,.2),rgba(126,232,199,.06))",
          boxShadow: "0 0 0 1px rgba(126,232,199,0.55)",
        },
        s.check,
      )
    : sx(
        { background: "rgba(255,255,255,0.7)", boxShadow: "0 0 0 1px rgba(0,92,88,0.15)" },
        { background: "rgba(126,232,199,0.04)", boxShadow: "0 0 0 1px rgba(126,232,199,0.2)" },
        s.check,
      );
  const boxBase: CSSProperties = {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const waBox = waOn
    ? sx(
        {
          ...boxBase,
          background: "linear-gradient(180deg,#00706a,#004541)",
          color: "#ffffff",
          boxShadow: "0 0 10px rgba(126,232,199,0.6)",
        },
        { background: "linear-gradient(180deg,#b8f2de,#7ee8c7)", color: "#001412" },
      )
    : sx(
        {
          ...boxBase,
          background: "#ffffff",
          color: "transparent",
          border: "1.5px solid rgba(0,92,88,0.4)",
        },
        { background: "transparent", border: "1.5px solid rgba(126,232,199,0.45)" },
      );
  const small = (l: CSSProperties, d: string) => sx(l, { color: d });

  const textField = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={tId} style={{ fontSize: 14, fontWeight: 700 }}>
        {spec.label}
      </label>
      <textarea
        ref={textRef}
        className={s.fld}
        id={tId}
        rows={mobile ? 2 : 3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setErr("");
        }}
        aria-invalid={err ? true : undefined}
        style={{ lineHeight: "24px" }}
      />
      {err ? (
        <span
          {...sx(
            { fontSize: mobile ? 13 : 14, fontWeight: 700, color: "#6b4c10" },
            { color: "#d6ae62" },
          )}
        >
          {err}
        </span>
      ) : null}
    </div>
  );

  const waPanel = isApprove ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label {...waCheck}>
        <input type="checkbox" checked={waOn} onChange={(e) => setWaOn(e.target.checked)} />
        <span aria-hidden="true" {...waBox}>
          <Ic d={P.ok} size={14} stroke={3} />
        </span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span>أرسل رسالة واتساب إلى العميل</span>
          <span
            {...small(
              { fontSize: 12, fontWeight: 500, color: "rgba(3,9,9,0.6)" },
              "rgba(242,251,248,0.6)",
            )}
          >
            {mobile ? "برقم الطلب ورابط صفحة التتبع" : "تتضمن رقم الطلب ورابط صفحة التتبع"}
          </span>
        </span>
      </label>
      {waOn ? (
        <div
          {...(mobile
            ? { className: s.fade, style: { display: "flex", flexDirection: "column", gap: 8 } }
            : sx(
                {
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 14,
                  borderRadius: 20,
                  background: "linear-gradient(135deg,rgba(184,242,222,.35),rgba(126,232,199,.1))",
                  boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.12)",
                },
                {
                  background: "rgba(126,232,199,0.06)",
                  boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.22)",
                },
                s.fade,
              ))}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              {...sx(
                {
                  display: "flex",
                  alignItems: "center",
                  gap: mobile ? 6 : 8,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#005c58",
                },
                { color: "#7ee8c7" },
              )}
            >
              <Ic d={P.chat} size={mobile ? 16 : 18} />
              معاينة الرسالة · {r.name}
            </span>
            {mobile ? null : (
              <span
                dir="ltr"
                {...small({ fontSize: 12, color: "rgba(3,9,9,0.55)" }, "rgba(242,251,248,0.5)")}
              >
                {r.phone}
              </span>
            )}
          </div>
          <div className={s.waBubble}>
            {waText}
            <span
              aria-hidden="true"
              {...small(
                {
                  position: "absolute",
                  bottom: 5,
                  left: 12,
                  fontSize: 11,
                  color: "rgba(3,39,34,0.55)",
                },
                "rgba(126,232,199,0.7)",
              )}
            >
              الآن ✓✓
            </span>
          </div>
          {mobile ? null : (
            <div
              {...sx(
                {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 6px 6px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.85)",
                  boxShadow: "inset 0 0 0 1px rgba(0,92,88,0.15)",
                },
                {
                  background: "rgba(0,20,18,0.6)",
                  boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.3)",
                },
              )}
            >
              <Ic d={P.link} size={16} {...small({ color: "#005c58" }, "#7ee8c7")} />
              <span
                dir="ltr"
                {...small(
                  {
                    flexGrow: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#005c58",
                  },
                  "#b8f2de",
                )}
              >
                {url}
              </span>
              <button
                className={cn(s.btn, s.soft)}
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(url).catch(() => undefined);
                  setCopied(true);
                }}
                style={{
                  flexShrink: 0,
                  minHeight: 32,
                  padding: "2px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {copied ? "نُسخ ✓" : "انسخ الرابط"}
              </button>
            </div>
          )}
          <p
            {...small(
              { margin: 0, fontSize: 12, lineHeight: "20px", color: "rgba(3,9,9,0.6)" },
              "rgba(242,251,248,0.55)",
            )}
          >
            {mobile
              ? "في النسخة الفعلية تُرسل الرسالة تلقائيًا إلى رقم العميل [بانتظار ربط واتساب للأعمال]."
              : "في النسخة الفعلية تُرسل الرسالة تلقائيًا إلى رقم العميل [بانتظار ربط واتساب للأعمال]. رابط الموقع النهائي بانتظار التأكيد."}
          </p>
        </div>
      ) : null}
    </div>
  ) : null;

  if (mobile) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          aria-label="إغلاق"
          onClick={onClose}
          {...sx(
            {
              position: "absolute",
              inset: 0,
              border: 0,
              background: "rgba(0,43,40,0.45)",
              WebkitBackdropFilter: "blur(4px)",
              backdropFilter: "blur(4px)",
            },
            { background: "rgba(0,8,7,0.6)" },
            s.fade,
          )}
        />
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby={hId}
          onSubmit={submit}
          className={cn(s.sheet, o.sheet)}
          style={{
            position: "relative",
            isolation: "isolate",
            maxHeight: "88vh",
            overflowY: "auto",
            borderRadius: "28px 28px 0 0",
            padding: "12px 18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            aria-hidden="true"
            className={s.darkOnly}
            style={{
              position: "absolute",
              zIndex: -1,
              inset: 0,
              background:
                "radial-gradient(ellipse 80% 40% at 75% 0%, rgba(5,64,57,0.9) 0%, rgba(5,64,57,0) 100%)",
            }}
          />
          <span
            aria-hidden="true"
            {...sx(
              {
                alignSelf: "center",
                width: 44,
                height: 5,
                borderRadius: 999,
                background: "rgba(0,92,88,0.25)",
              },
              { background: "rgba(126,232,199,0.45)" },
            )}
          />
          <h2
            id={hId}
            ref={headingRef}
            tabIndex={-1}
            {...sx(
              { margin: 0, fontSize: 20, lineHeight: "32px", fontWeight: 800 },
              { color: "#ffffff" },
            )}
          >
            {spec.title}
          </h2>
          <p
            {...small(
              { margin: 0, fontSize: 14, lineHeight: "24px", color: "rgba(3,9,9,0.7)" },
              "rgba(242,251,248,0.72)",
            )}
          >
            {spec.body}
          </p>
          {textField}
          {waPanel}
          {saveError}
          <button
            className={cn(s.btn, spec.line ? s.line : s.cta)}
            type="submit"
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 52,
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {confirmLabel}
          </button>
          <button
            className={cn(s.btn, s.soft)}
            type="button"
            onClick={onClose}
            style={{ minHeight: 46, borderRadius: 999, fontSize: 14, fontWeight: 700 }}
          >
            إلغاء
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        {...sx(
          {
            position: "absolute",
            inset: 0,
            background: "rgba(0,43,40,0.45)",
            WebkitBackdropFilter: "blur(4px)",
            backdropFilter: "blur(4px)",
          },
          { background: "rgba(0,8,7,0.6)" },
          s.fade,
        )}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={hId}
        onSubmit={submit}
        className={cn(s.pop, o.dialog)}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 540,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          borderRadius: 28,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h2
          id={hId}
          ref={headingRef}
          tabIndex={-1}
          {...sx(
            { margin: 0, fontSize: 22, lineHeight: "34px", fontWeight: 800 },
            { color: "#ffffff" },
          )}
        >
          {spec.title}
        </h2>
        <p
          {...small(
            { margin: 0, fontSize: 15, lineHeight: "26px", color: "rgba(3,9,9,0.7)" },
            "rgba(242,251,248,0.72)",
          )}
        >
          {spec.body}
        </p>
        {textField}
        {waPanel}
        {isApprove ? null : (
          <p
            {...sx(
              {
                margin: 0,
                padding: "10px 14px",
                borderRadius: 16,
                background: "linear-gradient(135deg,rgba(184,242,222,.4),rgba(126,232,199,.14))",
                fontSize: 13,
                lineHeight: "22px",
              },
              {
                background: "rgba(126,232,199,0.08)",
                boxShadow: "inset 0 0 0 1px rgba(126,232,199,0.2)",
              },
            )}
          >
            سيصل العميل إشعار بالقرار عبر واتساب [قناة الإشعار بانتظار الربط].
          </p>
        )}
        {saveError}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", flexWrap: "wrap" }}>
          <button
            className={cn(s.btn, spec.line ? s.line : s.cta)}
            type="submit"
            disabled={saving}
            style={{
              minHeight: 48,
              padding: "10px 24px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {confirmLabel}
          </button>
          <button
            className={cn(s.btn, s.soft)}
            type="button"
            onClick={onClose}
            style={{
              minHeight: 48,
              padding: "10px 22px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

/** Confirmation toast with an «open WhatsApp» link when a message was prepared. */
export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const check = (
    <span
      aria-hidden="true"
      {...sx(
        {
          width: toast.mobile ? 30 : 32,
          height: toast.mobile ? 30 : 32,
          flexShrink: 0,
          borderRadius: 999,
          background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
          color: "#01302d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        { color: "#001412" },
      )}
    >
      <Ic d={P.ok} size={toast.mobile ? 16 : 18} stroke={2.6} />
    </span>
  );
  const close = (
    <button
      type="button"
      onClick={onClose}
      aria-label="إغلاق الإشعار"
      {...sx(
        {
          width: toast.mobile ? 34 : 36,
          height: toast.mobile ? 34 : 36,
          flexShrink: 0,
          border: 0,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        { background: "rgba(126,232,199,0.08)" },
      )}
    >
      <Ic d={P.no} size={16} stroke={2.4} />
    </button>
  );
  const wa = toast.wa ? (
    <a
      className={cn(s.btn, s.cta)}
      href={toast.wa}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        flexShrink: 0,
        display: toast.mobile ? "flex" : "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: toast.mobile ? 42 : 38,
        padding: toast.mobile ? undefined : "4px 14px",
        borderRadius: 999,
        textDecoration: "none",
        fontSize: toast.mobile ? 14 : 13,
        fontWeight: 800,
      }}
    >
      <Ic d={P.chat} size={16} />
      {toast.mobile ? "افتح واتساب وأرسل الرسالة" : "افتح واتساب"}
    </a>
  ) : null;
  const frame = sx(
    {
      position: "fixed",
      zIndex: toast.mobile ? 70 : 30,
      display: "flex",
      gap: 10,
      borderRadius: 20,
      background: "#01302d",
      color: "#ffffff",
      fontWeight: 600,
      border: "1px solid rgba(126,232,199,0.55)",
      boxShadow: "0 0 26px rgba(126,232,199,0.3), 0 16px 34px rgba(0,43,40,0.35)",
      ...(toast.mobile
        ? {
            top: 16,
            left: 12,
            right: 12,
            flexDirection: "column",
            padding: "12px 14px",
            fontSize: 14,
          }
        : {
            bottom: 24,
            left: 24,
            maxWidth: 480,
            alignItems: "center",
            padding: "12px 14px 12px 18px",
            fontSize: 15,
          }),
    },
    {
      background: "#032722",
      border: "1px solid rgba(126,232,199,0.5)",
      boxShadow: "0 0 26px rgba(126,232,199,0.25), 0 16px 34px rgba(0,0,0,0.45)",
    },
    cn(s.dk, s.pop),
  );
  if (toast.mobile) {
    return (
      <div role="status" {...frame}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {check}
          <span style={{ flexGrow: 1 }}>{toast.text}</span>
          {close}
        </div>
        {wa}
      </div>
    );
  }
  return (
    <div role="status" {...frame}>
      {check}
      <span style={{ flexGrow: 1 }}>{toast.text}</span>
      {wa}
      {close}
    </div>
  );
}
