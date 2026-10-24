"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ar } from "@/i18n/ar";
import type { FieldErrors } from "@/lib/errors";
import { cn } from "@/lib/cn";
import type { CategoryKey } from "@/modules/catalog/schemas";
import {
  COLORS,
  editOrderSchema,
  hasSizeSplit,
  PRINT_PLACES,
  STICKER_SHAPES,
  WEAR_SIZES,
} from "@/modules/orders/schemas";
import s from "../admin.module.css";
import { sx } from "../theme";
import type { Order } from "./data";
import o from "./orders.module.css";

type Form = Order["form"];
const L = ar.order.builder;

/**
 * «تعديل الطلب» (admin, `orders.edit`): corrects the order's details. The fields follow the
 * order's category, like the Request Builder; the server writes only what changed and logs it.
 * A centred dialog on desktop, a bottom sheet on phones (same frames as DecisionDialog).
 */
export function EditOrderDialog({
  order: r,
  mobile,
  saving,
  error,
  fieldErrors,
  onClose,
  onSave,
}: {
  order: Order;
  mobile: boolean;
  saving: boolean;
  /** The server's message when saving failed (nothing was changed). */
  error: string;
  fieldErrors: FieldErrors;
  onClose: () => void;
  onSave: (form: Form) => void;
}) {
  const [form, setForm] = useState<Form>(r.form);
  const [errs, setErrs] = useState<FieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = useId();
  const hId = `${ids}-h`;
  const id = (k: string) => `${ids}-${k}`;

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrs((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const parsed = editOrderSchema.safeParse({ orderId: r.id, ...form });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "");
        next[k] = [...(next[k] ?? []), issue.message];
      }
      setErrs(next);
      return;
    }
    onSave(form);
  };

  const cat = r.categoryKey;
  const split = hasSizeSplit({ cat: cat as CategoryKey, prod: r.productKey ?? "" });
  const splitSum = WEAR_SIZES.reduce((n, k) => n + (Number(form.sizes[k]) || 0), 0);
  const errOf = (k: string) => errs[k]?.[0] ?? fieldErrors[k]?.[0];

  const labelStyle: CSSProperties = { fontSize: 14, fontWeight: 700 };
  const muted = sx(
    { margin: 0, fontSize: 13, lineHeight: "22px", color: "rgba(3,9,9,0.65)" },
    { color: "rgba(242,251,248,0.68)" },
  );
  const field = (k: string, label: string, input: ReactNode, full = false) => (
    <div
      key={k}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        gridColumn: full ? "1 / -1" : undefined,
      }}
    >
      <label htmlFor={id(k)} style={labelStyle}>
        {label}
      </label>
      {input}
      {errOf(k) ? (
        <span {...sx({ fontSize: 13, fontWeight: 700, color: "#6b4c10" }, { color: "#d6ae62" })}>
          {errOf(k)}
        </span>
      ) : null}
    </div>
  );
  const text = (k: "model" | "w" | "h" | "text" | "address", inputMode?: "decimal") => (
    <input
      className={s.fld}
      id={id(k)}
      value={form[k]}
      inputMode={inputMode}
      onChange={(e) => set(k, e.target.value)}
      aria-invalid={errOf(k) ? true : undefined}
    />
  );
  const area = (k: "desc" | "notes" | "artNotes") => (
    <textarea
      className={s.fld}
      id={id(k)}
      rows={2}
      value={form[k]}
      onChange={(e) => set(k, e.target.value)}
      aria-invalid={errOf(k) ? true : undefined}
      style={{ lineHeight: "24px", resize: "vertical" }}
    />
  );
  const select = <K extends "color" | "unit" | "shape" | "receipt">(
    k: K,
    options: readonly (readonly [string, string])[],
    empty: boolean,
  ) => (
    <select
      className={s.fld}
      id={id(k)}
      value={form[k]}
      onChange={(e) => set(k, e.target.value as Form[K])}
    >
      {empty ? <option value="">—</option> : null}
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
  const qty = field(
    "qty",
    split ? `${L.qty} (مجموع المقاسات)` : L.qty,
    <input
      className={s.fld}
      id={id("qty")}
      inputMode="numeric"
      value={split && splitSum ? String(splitSum) : form.qty}
      disabled={split && splitSum > 0}
      onChange={(e) => set("qty", e.target.value)}
      aria-invalid={errOf("qty") ? true : undefined}
    />,
  );

  const fields: ReactNode[] = [];
  if (cat === "wear") {
    fields.push(
      field(
        "color",
        "اللون",
        select(
          "color",
          COLORS.map((c) => [c, L.colors[c]] as const),
          true,
        ),
      ),
      qty,
    );
    if (split) {
      fields.push(
        <fieldset
          key="sizes"
          style={{ gridColumn: "1 / -1", margin: 0, padding: 0, border: 0, minWidth: 0 }}
        >
          <legend style={{ ...labelStyle, padding: 0, marginBottom: 6 }}>المقاسات</legend>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
              gap: 8,
            }}
          >
            {WEAR_SIZES.map((size) => (
              <label key={size} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  {size}
                </span>
                <input
                  className={s.fld}
                  inputMode="numeric"
                  value={form.sizes[size]}
                  onChange={(e) => set("sizes", { ...form.sizes, [size]: e.target.value })}
                  style={{ textAlign: "center" }}
                />
              </label>
            ))}
          </div>
          {errOf("sizes") ? <p {...muted}>{errOf("sizes")}</p> : null}
        </fieldset>,
      );
    }
    fields.push(
      <fieldset
        key="places"
        style={{ gridColumn: "1 / -1", margin: 0, padding: 0, border: 0, minWidth: 0 }}
      >
        <legend style={{ ...labelStyle, padding: 0, marginBottom: 6 }}>أماكن الطباعة</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {PRINT_PLACES.map((p) => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.places.includes(p)}
                onChange={(e) =>
                  set(
                    "places",
                    e.target.checked ? [...form.places, p] : form.places.filter((x) => x !== p),
                  )
                }
              />
              {L.placeLabels[p]}
            </label>
          ))}
        </div>
      </fieldset>,
    );
  } else if (cat === "mug") {
    fields.push(qty, field("text", L.mugText, text("text")));
  } else if (cat === "phone") {
    fields.push(
      field("model", L.phoneModel, text("model")),
      qty,
      field("text", "النص", text("text"), true),
    );
  } else if (cat === "sticker") {
    fields.push(
      field("w", "العرض", text("w", "decimal")),
      field("h", "الطول", text("h", "decimal")),
      field(
        "unit",
        "وحدة القياس",
        select(
          "unit",
          (["cm", "mm"] as const).map((u) => [u, L.units[u]] as const),
          true,
        ),
      ),
      field(
        "shape",
        L.shape,
        select(
          "shape",
          STICKER_SHAPES.map((x) => [x, L.shapes[x]] as const),
          true,
        ),
      ),
      qty,
    );
  } else {
    fields.push(qty, field("desc", "وصف الفكرة", area("desc"), true));
  }
  fields.push(
    field("notes", "ملاحظات العميل", area("notes"), true),
    field("artNotes", "ملاحظات التصميم", area("artNotes"), true),
    field(
      "receipt",
      L.receipt,
      select(
        "receipt",
        (["pickup", "delivery"] as const).map((x) => [x, L.receipts[x].t] as const),
        false,
      ),
    ),
    field(
      "date",
      "التاريخ المرغوب",
      <input
        className={s.fld}
        id={id("date")}
        type="date"
        dir="ltr"
        value={form.date}
        onChange={(e) => set("date", e.target.value)}
        aria-invalid={errOf("date") ? true : undefined}
      />,
    ),
  );
  if (form.receipt === "delivery")
    fields.push(field("address", "عنوان التوصيل", text("address"), true));

  const body = (
    <>
      <h2
        id={hId}
        ref={headingRef}
        tabIndex={-1}
        {...sx(
          { margin: 0, fontSize: mobile ? 20 : 22, lineHeight: "34px", fontWeight: 800 },
          { color: "#ffffff" },
        )}
      >
        تعديل الطلب <span dir="ltr">{r.ref}</span>
      </h2>
      <p {...muted}>يُسجَّل التعديل في سجل النشاط باسمك، ولن يصل العميل أي إشعار به.</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {fields}
      </div>
      {error ? (
        <p
          role="alert"
          {...sx(
            {
              margin: 0,
              padding: "10px 14px",
              borderRadius: 16,
              background: "#fbf6ec",
              border: "1px solid rgba(184,134,43,0.7)",
              fontSize: 14,
              fontWeight: 700,
            },
            { background: "rgba(214,174,98,0.12)", border: "1px solid rgba(214,174,98,0.7)" },
          )}
        >
          {error}
        </p>
      ) : null}
    </>
  );
  const buttons = (
    <div
      style={{
        display: "flex",
        flexDirection: mobile ? "column" : "row",
        gap: 10,
      }}
    >
      <button
        className={cn(s.btn, s.cta)}
        type="submit"
        disabled={saving}
        style={{
          minHeight: 48,
          padding: "10px 26px",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {saving ? "جارٍ الحفظ…" : "احفظ التعديلات"}
      </button>
      <button
        className={cn(s.btn, s.soft)}
        type="button"
        onClick={onClose}
        style={{
          minHeight: 46,
          padding: "10px 22px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        إلغاء
      </button>
    </div>
  );

  const backdrop = sx(
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
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: mobile ? 60 : 20,
        display: "flex",
        flexDirection: "column",
        alignItems: mobile ? undefined : "center",
        justifyContent: mobile ? "flex-end" : "center",
        padding: mobile ? 0 : 16,
      }}
    >
      <div aria-hidden="true" onClick={onClose} {...backdrop} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={hId}
        onSubmit={submit}
        noValidate
        className={mobile ? cn(s.sheet, o.sheet) : cn(s.pop, o.dialog)}
        style={{
          position: "relative",
          isolation: "isolate",
          width: "100%",
          maxWidth: mobile ? undefined : 640,
          maxHeight: mobile ? "88vh" : "calc(100vh - 32px)",
          overflowY: "auto",
          borderRadius: mobile ? "28px 28px 0 0" : 28,
          padding: mobile ? "16px 18px 24px" : 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {body}
        {buttons}
      </form>
    </div>
  );
}
