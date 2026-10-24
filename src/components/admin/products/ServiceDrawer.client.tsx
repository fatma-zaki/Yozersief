"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { Switch } from "../Kit.client";
import k from "../kit.module.css";

export type ServiceDraft = { name: string; description: string; visible: boolean };
/** What went wrong, per field when the server says which. */
export type ServiceFailure = { error: string; field: "name" | "description" | null };

/**
 * «خدمة جديدة»: adds a service card on the home page and an option in the request builder.
 * Same drawer as the product one; a new service has no product types, so customers ordering it
 * give a quantity and describe what they want.
 */
export function ServiceDrawer({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: ServiceDraft) => Promise<ServiceFailure | null>;
}) {
  const [d, setD] = useState<ServiceDraft>({ name: "", description: "", visible: true });
  const [errs, setErrs] = useState<{ name?: string; description?: string; form?: string }>({});
  const [busy, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  const errText = (text: string | undefined) =>
    text ? (
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warn-ink)" }}>{text}</span>
    ) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <button
        className={s.fade}
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          border: 0,
          background: "var(--overlay)",
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
        }}
      />
      <form
        className={k.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-h"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          const next: typeof errs = {};
          if (d.name.trim().length < 2) next.name = "اكتب اسم الخدمة.";
          if (d.description.trim().length < 10)
            next.description = "اكتب وصفًا قصيرًا للخدمة (10 أحرف على الأقل).";
          setErrs(next);
          if (next.name || next.description) return;
          startTransition(async () => {
            const failed = await onSave(d);
            if (!failed) return;
            setErrs(failed.field ? { [failed.field]: failed.error } : { form: failed.error });
          });
        }}
        style={{
          position: "relative",
          width: "min(460px, 100%)",
          height: "100%",
          overflowY: "auto",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--sheet-bg)",
          color: "var(--ink)",
          borderRadius: "0 28px 28px 0",
          boxShadow: "1px 0 0 rgba(126,232,199,0.6), 10px 0 34px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="sv-h" ref={heading} tabIndex={-1} className={k.h1} style={{ fontSize: 21 }}>
            خدمة جديدة
          </h2>
          <button
            className={cn(k.btn, k.soft)}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{ width: 40, height: 40, borderRadius: 999 }}
          >
            <Ic d={P.no} size={18} stroke={2.4} />
          </button>
        </div>
        <div
          className={k.tint}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 18 }}
        >
          <Image
            width={72}
            height={72}
            src="/images/categories/custom.jpg"
            alt=""
            style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover" }}
          />
          <span className={k.muted} style={{ fontSize: 13, lineHeight: "22px" }}>
            تظهر الخدمة بهذه الصورة إلى أن يُتاح رفع الصور. سيطلب منشئ الطلب من العميل الكمية ووصفًا
            لما يريده.
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="sv-name">
            اسم الخدمة
          </label>
          <input
            className={k.fld}
            id="sv-name"
            type="text"
            maxLength={60}
            placeholder="مثلًا: الطباعة على الحقائب"
            value={d.name}
            onChange={(e) => {
              setD({ ...d, name: e.target.value });
              setErrs({ ...errs, name: undefined });
            }}
            aria-invalid={errs.name ? true : undefined}
          />
          {errText(errs.name)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="sv-desc">
            وصف قصير
          </label>
          <textarea
            className={k.fld}
            id="sv-desc"
            rows={3}
            maxLength={200}
            placeholder="يظهر تحت اسم الخدمة في الصفحة الرئيسية ومنشئ الطلب"
            value={d.description}
            onChange={(e) => {
              setD({ ...d, description: e.target.value });
              setErrs({ ...errs, description: undefined });
            }}
            aria-invalid={errs.description ? true : undefined}
            style={{ lineHeight: "24px" }}
          />
          {errText(errs.description)}
        </div>
        <div
          className={k.tint}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
        >
          <Switch
            on={d.visible}
            onToggle={() => setD({ ...d, visible: !d.visible })}
            labelledBy="sv-vis"
          />
          <span id="sv-vis" style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: 14 }}>تظهر في الموقع ومنشئ الطلب</strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              أوقفها إذا أردت تجهيزها قبل أن يراها العملاء
            </span>
          </span>
        </div>
        {errs.form ? (
          <p
            role="alert"
            style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--warn-ink)" }}
          >
            {errs.form}
          </p>
        ) : null}
        <div style={{ marginTop: "auto", display: "flex", gap: 10, paddingTop: 8 }}>
          <button
            className={cn(k.btn, k.cta)}
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
            style={{ flex: "1 1 auto", minHeight: 50, borderRadius: 999, fontSize: 15 }}
          >
            إضافة الخدمة
          </button>
          <button
            className={cn(k.btn, k.soft)}
            type="button"
            onClick={onClose}
            style={{ minHeight: 50, padding: "0 22px", borderRadius: 999 }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
