"use client";

import { upload, uploadPresigned } from "@vercel/blob/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addGallerySampleAction,
  addGalleryUploadAction,
  deleteGalleryAction,
  updateGalleryAction,
} from "@/app/(dashboard)/dashboard/gallery/actions";
import { cn } from "@/lib/cn";
import type { GalleryData, GalleryView } from "@/modules/content";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, Switch, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import g from "./gallery.module.css";

/**
 * Gallery (brief B11), from docs/design/Admin-Gallery.html, on the content module's gallery use
 * cases. Publishing is locked until the customer's consent is ticked (brief A6.8); the server
 * enforces the same rule. Changes show at once and roll back if the server refuses them.
 */

type Item = GalleryView;
type Filter = "all" | "pub" | "hidden" | "pending";

const state = (x: Pick<Item, "pub" | "consent">): Exclude<Filter, "all"> =>
  x.pub ? "pub" : x.consent ? "hidden" : "pending";

/** ASCII Blob pathname (presigned uploads reject non-ASCII names); Blob adds a random suffix. */
function galleryPath(file: File): string {
  const ext = (file.name.split(".").pop() ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 5);
  return `gallery/photo${ext ? `.${ext}` : ""}`;
}

export function GalleryBoard({ data }: { data: GalleryData }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [items, setItems] = useState(data.items);
  const [filter, setFilter] = useState<Filter>("all");
  const [del, setDel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const { toast, flash, hide } = useFlash();
  // A server refresh brings the saved state; it replaces the optimistic one.
  const [synced, setSynced] = useState(data.items);
  if (synced !== data.items) {
    setSynced(data.items);
    setItems(data.items);
  }
  const savedCaption = (id: string) => data.items.find((x) => x.id === id)?.caption ?? "";

  const upd = (id: string, patch: Partial<Item>) =>
    setItems((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /** Shows the change now, saves it, and rolls back with the server's message if refused. */
  const save = (
    x: Item,
    change: { consent?: boolean; published?: boolean; caption?: string },
    okMessage?: string,
  ) => {
    const before = { consent: x.consent, pub: x.pub, caption: x.caption };
    startTransition(async () => {
      const result = await updateGalleryAction({ id: x.id, ...change });
      if (!result.ok) {
        upd(x.id, before);
        flash(result.error);
        return;
      }
      if (result.data.unpublishedByConsent)
        flash(`أُزيلت صورة «${x.cat}» من الموقع لأن الموافقة أُلغيت`);
      else if (okMessage) flash(okMessage);
      router.refresh();
    });
  };

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((f) => /^image\//.test(f.type));
    if (!images.length) return;
    if (!data.uploadMode) {
      flash("رفع الملفات غير متاح حاليًا.");
      return;
    }
    const put = data.uploadMode === "presigned" ? uploadPresigned : upload;
    setUploading((n) => n + images.length);
    let added = 0;
    let error = "";
    for (const file of images) {
      try {
        const blob = await put(galleryPath(file), file, {
          access: "public",
          handleUploadUrl: "/api/gallery/upload",
        });
        const result = await addGalleryUploadAction({ url: blob.url, pathname: blob.pathname });
        if (result.ok) added += 1;
        else error = result.error;
      } catch (e) {
        // Blob's own errors are English; show ours unless the server sent an Arabic one.
        error =
          e instanceof Error && /[\u0600-\u06FF]/.test(e.message)
            ? e.message
            : "فشل رفع الصورة. حاول مرة أخرى.";
      } finally {
        setUploading((n) => n - 1);
      }
    }
    flash(added ? `أُضيفت ${added} صورة مخفية` : error);
    if (added) router.refresh();
  };

  const pubN = items.filter((x) => x.pub).length;
  const pendN = items.filter((x) => !x.consent).length;
  const list = items.filter((x) => filter === "all" || state(x) === filter);
  const filters: [Filter, string][] = [
    ["all", `الكل · ${items.length}`],
    ["pub", "منشورة"],
    ["hidden", "مخفية"],
    ["pending", "بانتظار الموافقة"],
  ];
  const stats = [
    { n: pubN, label: "منشورة في الموقع", icon: P.eye },
    { n: items.length - pubN - pendN, label: "مخفية", icon: P.eyeOff },
    { n: pendN, label: "بانتظار موافقة العميل", icon: P.shield },
  ];

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader title="أعمالنا" subtitle="الصور التي تظهر في معرض الأعمال على الموقع">
        <div role="group" aria-label="فلتر" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {filters.map(([key, label]) => (
            <button
              key={key}
              className={cn(k.btn, k.chip, filter === key ? k.chipOn : k.chipOff)}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </KitHeader>

      <p
        className={cn(s.up, s.d1)}
        role="note"
        style={{
          margin: 0,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 18,
          background: "var(--warn-bg)",
          border: "1px solid var(--warn-bd)",
          color: "var(--ink)",
          fontSize: 13,
          lineHeight: "22px",
        }}
      >
        <Ic d={P.shieldCheck} size={20} style={{ color: "var(--warn-ink)" }} />
        <span>
          <strong>قاعدة النشر:</strong> لا تُنشر أي صورة لعمل عميل إلا بموافقته. يبقى زر النشر
          مقفلًا حتى تُحدَّد «موافقة العميل».
          {items.some((x) => x.isSample) ? " الصور الحالية نماذج عرض." : ""}
        </span>
      </p>

      <section
        className={cn(s.up, s.d2)}
        aria-label="ملخص"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        {stats.map((t) => (
          <div
            key={t.label}
            className={cn(k.card, k.lift)}
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderRadius: 22,
            }}
          >
            <span className={k.tile} aria-hidden="true" style={{ width: 44, height: 44 }}>
              <Ic d={t.icon} />
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <strong className={k.strong} style={{ fontSize: 26, lineHeight: "34px" }}>
                {t.n}
              </strong>
              <span className={k.muted} style={{ fontSize: 13, fontWeight: 700 }}>
                {t.label}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section
        className={cn(s.up, s.d3)}
        aria-label="الصور"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 16,
        }}
      >
        <div
          className={k.card}
          style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label
            className={g.drop}
            style={{
              flexGrow: 1,
              minHeight: 190,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 16,
              borderRadius: 20,
              border: "1.5px dashed var(--field-bd)",
              background: "var(--tint)",
              textAlign: "center",
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading > 0}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void uploadFiles(files);
              }}
            />
            <span
              className={k.tile}
              aria-hidden="true"
              style={{ width: 52, height: 52, borderRadius: 999 }}
            >
              <Ic d={P.upload} />
            </span>
            <strong className={k.strong} style={{ fontSize: 15 }}>
              {uploading ? `جارٍ رفع ${uploading} صورة…` : "ارفع صور جديدة"}
            </strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              JPG أو PNG — ستُضاف مخفية حتى تنشرها
            </span>
          </label>
          <button
            className={cn(k.btn, k.soft)}
            type="button"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                const result = await addGallerySampleAction();
                flash(result.ok ? "أُضيفت صورة جديدة مخفية حتى الموافقة" : result.error);
                if (result.ok) router.refresh();
              })
            }
            style={{ minHeight: 40, borderRadius: 999, fontSize: 13 }}
          >
            أضف صورة تجريبية
          </button>
        </div>
        {list.map((x) => {
          const st = state(x);
          return (
            <article key={x.id} className={cn(k.card, g.gcard, k.lift, !x.pub && g.hidden)}>
              <div className={g.gimg}>
                <Image
                  src={x.img}
                  alt={x.caption || x.cat}
                  fill
                  sizes="(max-width: 700px) 100vw, 320px"
                  unoptimized={!x.img.startsWith("/images/")}
                />
                <span
                  className={cn(k.badge, k.bGlass, g.glass)}
                  style={{ position: "absolute", top: 10, right: 10 }}
                >
                  {x.cat}
                </span>
                <span
                  className={cn(
                    k.badge,
                    st === "pub" ? k.bOk : st === "pending" ? k.bWarn : k.bOff,
                  )}
                  style={{ position: "absolute", top: 10, left: 10 }}
                >
                  {st === "pub" ? "منشورة" : st === "pending" ? "بانتظار موافقة العميل" : "مخفية"}
                </span>
                {x.isSample ? (
                  <span
                    className={cn(k.badge, k.bGlass, g.glass)}
                    style={{ position: "absolute", bottom: 10, right: 10 }}
                  >
                    نموذج عرض
                  </span>
                ) : null}
              </div>
              <div
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <input
                  className={cn(k.fld, g.fld)}
                  type="text"
                  value={x.caption}
                  onChange={(e) => upd(x.id, { caption: e.target.value })}
                  onBlur={(e) => {
                    const caption = e.target.value.trim();
                    if (caption === savedCaption(x.id)) return;
                    save(x, { caption });
                  }}
                  aria-label={`وصف صورة ${x.cat}`}
                  placeholder="وصف قصير يظهر تحت الصورة"
                />
                <label className={k.chk}>
                  <input
                    type="checkbox"
                    checked={x.consent}
                    onChange={(e) => {
                      const c = e.target.checked;
                      upd(x.id, { consent: c, pub: c ? x.pub : false });
                      save(x, { consent: c });
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...(x.consent
                        ? {
                            background: "linear-gradient(180deg,#00a08f,#00706a)",
                            color: "#fff",
                            boxShadow: "0 0 8px rgba(126,232,199,0.6)",
                          }
                        : {
                            background: "transparent",
                            color: "transparent",
                            border: "1.5px solid var(--field-bd)",
                          }),
                    }}
                  >
                    <Ic d={P.ok} size={13} stroke={3} />
                  </span>
                  <span>لديّ موافقة العميل على النشر</span>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 8,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Switch
                    on={x.pub}
                    disabled={!x.consent}
                    label={`نشر صورة ${x.cat}`}
                    onToggle={() => {
                      if (!x.consent) return;
                      upd(x.id, { pub: !x.pub });
                      save(
                        x,
                        { published: !x.pub },
                        x.pub ? "أُخفيت الصورة من المعرض" : "نُشرت الصورة في معرض الأعمال",
                      );
                    }}
                  />
                  <span style={{ flexGrow: 1, fontSize: 13, fontWeight: 700 }}>
                    {x.pub ? "منشورة في الموقع" : x.consent ? "مخفية" : "تحتاج إلى موافقة أولًا"}
                  </span>
                  <button
                    className={cn(k.btn, k.line)}
                    type="button"
                    onClick={() => setDel(x.id)}
                    aria-label={`حذف صورة ${x.cat}`}
                    style={{ width: 36, height: 36, borderRadius: 999 }}
                  >
                    <Ic d={P.trash} size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {list.length === 0 ? (
        <div className={k.card} style={{ padding: "32px 16px", textAlign: "center" }}>
          <strong>لا توجد صور في هذا القسم</strong>
        </div>
      ) : null}

      {del !== null ? (
        <ConfirmDelete
          onCancel={() => setDel(null)}
          onDelete={() => {
            const id = del;
            setDel(null);
            startTransition(async () => {
              const result = await deleteGalleryAction({ id });
              flash(result.ok ? "حُذفت الصورة" : result.error);
              if (result.ok) {
                setItems((all) => all.filter((x) => x.id !== id));
                router.refresh();
              }
            });
          }}
        />
      ) : null}
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}

function ConfirmDelete({ onCancel, onDelete }: { onCancel: () => void; onDelete: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className={s.fade}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--overlay)",
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        className={cn(k.card, s.pop)}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-h"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--sheet-bg)",
        }}
      >
        <h2 id="del-h" className={k.h2} style={{ fontSize: 20 }}>
          هل تريد حذف هذه الصورة؟
        </h2>
        <p className={k.muted} style={{ margin: 0, fontSize: 14, lineHeight: "24px" }}>
          ستختفي من المعرض ومن لوحة الإدارة، ولن تتمكن من استعادتها.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={cn(k.btn, k.cta)}
            type="button"
            onClick={onDelete}
            style={{ minHeight: 46, padding: "0 22px", borderRadius: 999 }}
          >
            احذف
          </button>
          <button
            ref={cancelRef}
            className={cn(k.btn, k.soft)}
            type="button"
            onClick={onCancel}
            style={{ minHeight: 46, padding: "0 22px", borderRadius: 999 }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
