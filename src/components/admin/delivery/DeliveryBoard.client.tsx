"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  confirmHandoverAction,
  recordPaymentAction,
} from "@/app/(dashboard)/dashboard/delivery/actions";
import { cn } from "@/lib/cn";
import type { DeliveryData, HandoverView } from "@/modules/orders";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import { orderImage } from "../orders/data";
import d from "../team-kit.module.css";

const STATE: Record<HandoverView["state"], [string, string | undefined]> = {
  ready: ["جاهز", k.bOk],
  qc: ["ما زال في الفحص", k.bOff],
  done: ["سُلّم", k.bRole],
};
const FILE = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6";

/**
 * Delivery & collection (brief B10), from docs/design/Team-Delivery.html: hand over ready orders
 * after checking the customer's last 3 phone digits, record payments for the admin to confirm,
 * and see which invoices are due.
 */
export function DeliveryBoard({ data, canRecord }: { data: DeliveryData; canRecord: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pay, setPay] = useState({
    order: data.payOrders[0]?.id ?? "",
    amount: "",
    method: "cash" as "cash" | "transfer",
  });
  const [payErr, setPayErr] = useState("");
  const [wa, setWa] = useState("");
  const { toast, flash, hide } = useFlash();
  const ready = data.handovers.filter((h) => h.state === "ready").length;

  const confirm = (h: HandoverView) => (e: FormEvent) => {
    e.preventDefault();
    const code = codes[h.id] ?? "";
    if (code.length !== 3) {
      setErrs((m) => ({ ...m, [h.id]: "اكتب آخر 3 أرقام من هاتف العميل." }));
      return;
    }
    startTransition(async () => {
      const r = await confirmHandoverAction({ orderId: h.id, code });
      if (!r.ok) {
        setErrs((m) => ({ ...m, [h.id]: r.error }));
        return;
      }
      const result = r.data;
      if (!result.done) {
        const left = result.attemptsLeft;
        setErrs((m) => ({
          ...m,
          [h.id]: left
            ? `الأرقام لا تطابق هاتف صاحب الطلب. تحقّق من العميل. (المحاولات المتبقية: ${left})`
            : "الأرقام خاطئة مرة أخرى. أُغلق التسليم — تواصل مع المدير ليراجع الطلب.",
        }));
        router.refresh();
        return;
      }
      setWa(result.waLink ?? "");
      flash(`سُلّم ${result.ref} — رسالة الشكر للعميل جاهزة`);
      router.refresh();
    });
  };

  const record = (e: FormEvent) => {
    e.preventDefault();
    if (!pay.order) return;
    if (!pay.amount.trim()) {
      setPayErr("اكتب المبلغ أولًا.");
      flash("اكتب المبلغ أولًا");
      return;
    }
    startTransition(async () => {
      const r = await recordPaymentAction({
        orderId: pay.order,
        amount: pay.amount,
        method: pay.method,
      });
      if (!r.ok) {
        setPayErr(r.fieldErrors?.amount?.[0] ?? r.error);
        return;
      }
      setPay((p) => ({ ...p, amount: "" }));
      setWa("");
      flash("سُجّلت الدفعة — بانتظار تأكيد المدير");
      router.refresh();
    });
  };

  return (
    <div className={k.root}>
      <KitHeader
        title="التسليم والتحصيل"
        subtitle="سلّم الطلبات الجاهزة بعد التحقق، وسجّل العربون والمبالغ المحصّلة"
      />

      <div
        className={k.stackM}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          className={cn(k.card, s.up, s.d1)}
          aria-labelledby="h-h"
          style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 id="h-h" className={k.h2}>
              جاهز للتسليم اليوم
            </h2>
            <span className={k.muted} style={{ fontSize: 12 }}>
              {ready} {ready === 1 ? "طلب" : "طلبات"}
            </span>
          </div>
          {data.handovers.length ? (
            data.handovers.map((h) => (
              <article
                key={h.id}
                className={cn(k.tint, s.fade)}
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 46px thumb, as in the design */}
                  <img
                    src={orderImage(h)}
                    alt=""
                    style={{ width: 46, height: 46, borderRadius: 14, objectFit: "cover" }}
                  />
                  <span
                    style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
                  >
                    <strong style={{ fontSize: 15, color: "var(--ink-strong)" }}>
                      {h.name} · {h.product}
                    </strong>
                    <span className={k.muted} style={{ fontSize: 13 }}>
                      <span dir="ltr">{h.ref}</span> · {h.method} · <span dir="ltr">{h.phone}</span>
                    </span>
                  </span>
                  <span className={cn(k.badge, STATE[h.state][1])}>{STATE[h.state][0]}</span>
                </div>
                {h.state === "ready" ? (
                  h.locked ? (
                    <p
                      role="alert"
                      style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--warn-ink)" }}
                    >
                      أُغلق التسليم بعد محاولات خاطئة كثيرة. تواصل مع المدير ليراجع الطلب.
                    </p>
                  ) : (
                    <>
                      <form
                        onSubmit={confirm(h)}
                        noValidate
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          alignItems: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            flex: "1 1 200px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <label className={k.lbl} htmlFor={`c-${h.id}`}>
                            آخر 3 أرقام من هاتف العميل
                          </label>
                          <input
                            className={k.fld}
                            id={`c-${h.id}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            dir="ltr"
                            autoComplete="off"
                            value={codes[h.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9٠-٩]/g, "").slice(0, 3);
                              setCodes((m) => ({ ...m, [h.id]: v }));
                              setErrs((m) => ({ ...m, [h.id]: "" }));
                            }}
                            aria-invalid={errs[h.id] ? true : undefined}
                            placeholder="•••"
                            style={{ textAlign: "center", letterSpacing: 6, fontWeight: 800 }}
                          />
                        </div>
                        <button
                          className={cn(k.btn, k.cta)}
                          type="submit"
                          disabled={busy}
                          style={{
                            minHeight: 46,
                            padding: "6px 20px",
                            borderRadius: 999,
                            fontSize: 14,
                          }}
                        >
                          تأكيد التسليم
                        </button>
                        {errs[h.id] ? (
                          <p
                            role="alert"
                            style={{
                              flexBasis: "100%",
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--warn-ink)",
                            }}
                          >
                            {errs[h.id]}
                          </p>
                        ) : null}
                      </form>
                      {h.due ? (
                        <p className={d.waNote} style={{ margin: 0 }}>
                          المتبقي على العميل: {h.due} — سجّله في التحصيل قبل التسليم.
                        </p>
                      ) : null}
                    </>
                  )
                ) : null}
              </article>
            ))
          ) : (
            <p className={k.muted} style={{ margin: 0, fontSize: 14 }}>
              لا توجد طلبات جاهزة للتسليم حاليًا.
            </p>
          )}
          <p className={d.waNote} style={{ margin: 0 }}>
            بعد التأكيد تُجهَّز رسالة شكر للعميل عبر واتساب، ويُغلق الطلب في صفحة التتبع.
          </p>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section
            className={cn(k.card, s.up, s.d2)}
            aria-labelledby="p-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <h2 id="p-h" className={k.h2}>
              تسجيل دفعة
            </h2>
            {canRecord && data.payOrders.length ? (
              <form
                onSubmit={record}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className={k.lbl} htmlFor="p-o">
                    الطلب
                  </label>
                  <select
                    className={k.fld}
                    id="p-o"
                    value={pay.order}
                    onChange={(e) => setPay((p) => ({ ...p, order: e.target.value }))}
                  >
                    {data.payOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className={k.lbl} htmlFor="p-a">
                      المبلغ
                    </label>
                    <input
                      className={k.fld}
                      id="p-a"
                      type="text"
                      inputMode="decimal"
                      value={pay.amount}
                      onChange={(e) => {
                        setPay((p) => ({ ...p, amount: e.target.value }));
                        setPayErr("");
                      }}
                      aria-invalid={payErr ? true : undefined}
                      placeholder="[المبلغ]"
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className={k.lbl} htmlFor="p-m">
                      الطريقة
                    </label>
                    <select
                      className={k.fld}
                      id="p-m"
                      value={pay.method}
                      onChange={(e) =>
                        setPay((p) => ({ ...p, method: e.target.value as "cash" | "transfer" }))
                      }
                    >
                      <option value="cash">نقدًا في المتجر</option>
                      <option value="transfer">تحويل [الطرق للتأكيد]</option>
                    </select>
                  </div>
                </div>
                {payErr ? (
                  <p
                    role="alert"
                    style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--warn-ink)" }}
                  >
                    {payErr}
                  </p>
                ) : null}
                <button
                  className={cn(k.btn, k.cta)}
                  type="submit"
                  disabled={busy}
                  style={{
                    alignSelf: "flex-start",
                    minHeight: 46,
                    padding: "6px 22px",
                    borderRadius: 999,
                    fontSize: 14,
                  }}
                >
                  سجّل الدفعة
                </button>
              </form>
            ) : (
              <p className={k.muted} style={{ margin: 0, fontSize: 14 }}>
                {canRecord
                  ? "لا توجد طلبات بانتظار دفعات حاليًا."
                  : "تسجيل الدفعات ليس ضمن صلاحيات دورك."}
              </p>
            )}
            {data.payments.length ? (
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
                {data.payments.map((x) => (
                  <li
                    key={x.id}
                    className={cn(k.tint, s.fade)}
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <span dir="ltr" style={{ fontWeight: 800 }}>
                      {x.ref}
                    </span>
                    <span style={{ flexGrow: 1 }}>{x.what}</span>
                    <span className={cn(k.badge, x.pending ? k.bWarn : k.bOk)}>
                      {x.pending ? "بانتظار المدير" : "تم التأكيد"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <p className={d.waNote} style={{ margin: 0 }}>
              تبقى أي دفعة مسجّلة «بانتظار تأكيد المدير» حتى يراجعها.
            </p>
          </section>

          <section
            className={cn(k.card, s.up, s.d3)}
            aria-labelledby="i-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <h2 id="i-h" className={k.h2}>
              فواتير مطلوبة
            </h2>
            {data.invoices.length ? (
              data.invoices.map((i) => (
                <div
                  key={i.id}
                  className={k.tint}
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <Ic d={FILE} size={18} style={{ color: "var(--accent-ink)" }} />
                  <span style={{ flexGrow: 1 }}>{i.title}</span>
                  <span className={cn(k.badge, k.bRole)}>[نوع الفاتورة للتأكيد]</span>
                </div>
              ))
            ) : (
              <p className={k.muted} style={{ margin: 0, fontSize: 13 }}>
                لا توجد فواتير مطلوبة حاليًا.
              </p>
            )}
            <div className={d.lockrow}>
              <Ic d={P.lock} size={18} />
              <span>تعديل الأسعار والخصومات وإلغاء الطلبات من صلاحيات المدير فقط.</span>
            </div>
          </section>
        </div>
      </div>
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
