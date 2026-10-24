"use client";

import { upload, uploadPresigned } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { flagFilesAction, submitMockupAction } from "@/app/(dashboard)/dashboard/design/actions";
import { cn } from "@/lib/cn";
import type { DesignData, DesignJobView } from "@/modules/orders";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import { orderImage } from "../orders/data";
import d from "../team-kit.module.css";

type State = DesignJobView["state"];

const STATE: Record<State, [string, string | undefined]> = {
  need: ["محتاج موكاب", k.bOk],
  change: ["طلب تعديل", k.bWarn],
  waiting: ["مستني العميل", k.bRole],
  sent: ["عند الاستقبال", k.bRole],
};

const FILE = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6";
const ACCEPT = ".png,.jpg,.jpeg,.pdf,.ai,.psd,.svg";

/** ASCII Blob pathname (presigned uploads reject non-ASCII names); Blob adds a random suffix. */
function blobName(ref: string, name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80);
  return `mockups/${ref}/${/[A-Za-z0-9]/.test(base) ? base : "mockup"}${ext ? `.${ext}` : ""}`;
}

/**
 * The designer's workspace (brief B10), from docs/design/Team-Design.html: business orders at
 * the mockup stage, the customer's files and brief, and mockup versions. A new version goes to
 * the desk, which sends it to the customer.
 */
export function DesignBoard({ data }: { data: DesignData }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [selId, setSelId] = useState(data.jobs[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, flash, hide } = useFlash();
  const sel = data.jobs.find((j) => j.id === selId) ?? data.jobs[0];
  const canUpload = sel ? sel.state === "need" || sel.state === "change" : false;

  const onFile = async (file: File | undefined) => {
    if (!file || !sel) return;
    if (!data.uploadMode) {
      flash("رفع الملفات مش متاح دلوقتي.");
      return;
    }
    setUploading(true);
    try {
      const requestedPathname = blobName(sel.ref, file.name);
      const put = data.uploadMode === "presigned" ? uploadPresigned : upload;
      const blob = await put(requestedPathname, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/token",
        clientPayload: JSON.stringify({ kind: "mockup", orderId: sel.id }),
      });
      const result = await submitMockupAction({
        orderId: sel.id,
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        requestedPathname,
      });
      if (!result.ok) {
        flash(result.error);
        return;
      }
      flash(`اترفعت نسخة ${result.data.version} واتبعتت للاستقبال`);
      router.refresh();
    } catch (e) {
      // Blob's own errors are English; show ours unless the server sent an Arabic one.
      flash(
        e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : "رفع الملف فشل. جرّب تاني.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const flag = () => {
    if (!sel) return;
    startTransition(async () => {
      const result = await flagFilesAction({ orderId: sel.id });
      flash(result.ok ? `اتبعت تنبيه للاستقبال بخصوص ملفات ${sel.ref}` : result.error);
    });
  };

  const stats = [
    { label: "محتاج موكاب", n: data.stats.need },
    { label: "طلبات تعديل", n: data.stats.change },
    { label: "مستني اعتماد العميل", n: data.stats.waiting },
  ];

  return (
    <div className={k.root}>
      <KitHeader
        title="الموكابات والتصميم"
        subtitle="جهّز الموكاب، راجع ملفات العملاء، ونفّذ طلبات التعديل"
      />

      <section
        aria-label="ملخص"
        className={cn(s.up, s.d1)}
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
      >
        {stats.map((t) => (
          <div key={t.label} className={cn(k.card, d.stat)}>
            <span className={k.muted} style={{ fontSize: 13, fontWeight: 700 }}>
              {t.label}
            </span>
            <strong style={{ fontSize: 32, lineHeight: "44px", color: "var(--ink-strong)" }}>
              {t.n}
            </strong>
          </div>
        ))}
      </section>

      <div
        className={k.stackM}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          className={cn(k.card, s.up, s.d2)}
          aria-labelledby="j-h"
          style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <h2 id="j-h" className={k.h2} style={{ padding: "4px 6px" }}>
            شغلك
          </h2>
          {data.jobs.length ? (
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
              {data.jobs.map((j) => (
                <li key={j.id}>
                  <button
                    className={d.rowb}
                    type="button"
                    aria-current={j.id === sel?.id}
                    onClick={() => setSelId(j.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 46px thumb, as in the design */}
                    <img
                      src={orderImage(j)}
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
                      <strong style={{ fontSize: 15, color: "var(--ink-strong)" }}>
                        {j.title}
                      </strong>
                      <span className={k.muted} style={{ fontSize: 13 }}>
                        {j.product} · <span dir="ltr">{j.ref}</span>
                      </span>
                    </span>
                    <span className={cn(k.badge, STATE[j.state][1])}>{STATE[j.state][0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={k.muted} style={{ margin: 0, padding: "18px 6px", fontSize: 14 }}>
              مفيش موكابات مطلوبة دلوقتي. الطلبات هتوصلك هنا بعد ما العميل يوافق على عرض السعر.
            </p>
          )}
          <div className={d.lockrow}>
            <Ic d={P.eyeOff} size={18} />
            <span>
              أرقام العملاء والأسعار مخفية عن دور المصمم. أي تواصل مع العميل بيعدّي على الاستقبال.
            </span>
          </div>
        </section>

        {sel ? (
          <section
            key={sel.id}
            className={cn(k.card, s.up, s.d3)}
            aria-labelledby="jd-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <span
                  dir="ltr"
                  className={k.muted}
                  style={{ alignSelf: "flex-end", fontSize: 12, fontWeight: 700 }}
                >
                  {sel.ref}
                </span>
                <h2 id="jd-h" className={k.h1} style={{ fontSize: 21 }}>
                  {sel.title} — {sel.product}
                </h2>
              </div>
              <span className={cn(k.badge, STATE[sel.state][1])}>{STATE[sel.state][0]}</span>
            </div>

            {sel.change ? (
              <div
                className={s.pop}
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "var(--warn-bg)",
                  border: "1px solid var(--warn-bd)",
                  color: "var(--warn-ink)",
                  fontSize: 14,
                  lineHeight: "22px",
                }}
              >
                <strong>تعديل مطلوب من العميل:</strong> {sel.change}
              </div>
            ) : null}

            <div
              className={k.stackM}
              style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: 14 }}
            >
              <div
                style={{
                  height: 200,
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#f0f0f0",
                  boxShadow: "0 0 0 1px rgba(126,232,199,0.45), 0 0 18px rgba(126,232,199,0.2)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- mockup from Blob via our file route */}
                <img
                  src={sel.preview ?? orderImage(sel)}
                  alt={sel.preview ? "آخر نسخة من الموكاب" : "صورة المنتج"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 className={k.h2} style={{ fontSize: 14 }}>
                  ملفات العميل
                </h3>
                {sel.files.length ? (
                  sel.files.map((f) => (
                    <a
                      key={f.url + f.name}
                      className={k.tint}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <Ic d={FILE} size={18} style={{ color: "var(--accent-ink)" }} />
                      <span
                        dir="ltr"
                        style={{ flexGrow: 1, fontSize: 13, fontWeight: 700, textAlign: "right" }}
                      >
                        {f.name}
                      </span>
                      <span className={cn(k.badge, f.ok ? k.bOk : k.bWarn)}>{f.label}</span>
                    </a>
                  ))
                ) : (
                  <span className={k.muted} style={{ fontSize: 13 }}>
                    العميل ما رفعش ملفات.
                  </span>
                )}
                <h3 className={k.h2} style={{ fontSize: 14, marginTop: 4 }}>
                  البريف
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: "23px", whiteSpace: "pre-line" }}>
                  {sel.brief || "مفيش تفاصيل إضافية."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 className={k.h2} style={{ fontSize: 14 }}>
                نسخ الموكاب
              </h3>
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
                {(sel.versions.length
                  ? sel.versions
                  : [{ n: "—", note: "لسه مفيش نسخ", t: "" }]
                ).map((v) => (
                  <li
                    key={v.n}
                    className={cn(k.tint, s.fade)}
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <strong style={{ color: "var(--ink-strong)" }}>{v.n}</strong>
                    <span style={{ flexGrow: 1 }}>{v.note}</span>
                    <span className={k.muted}>{v.t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                className={cn(k.btn, k.cta)}
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canUpload || uploading}
                title={canUpload ? undefined : "في نسخة لسه عند الاستقبال أو العميل"}
                style={{ minHeight: 46, padding: "8px 22px", borderRadius: 999, fontSize: 14 }}
              >
                <Ic d={P.upload} size={18} />
                {uploading ? "بيترفع…" : "ارفع نسخة موكاب جديدة"}
              </button>
              <button
                className={cn(k.btn, k.soft)}
                type="button"
                onClick={flag}
                disabled={busy}
                style={{ minHeight: 46, padding: "8px 20px", borderRadius: 999, fontSize: 14 }}
              >
                بلّغ الاستقبال بمشكلة في الملف
              </button>
            </div>
            <p className={d.waNote} style={{ margin: 0 }}>
              الموكاب بيروح للاستقبال يراجعه ويبعته للعميل. اعتماد العميل بيظهر هنا تلقائي.
            </p>
          </section>
        ) : null}
      </div>
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}
