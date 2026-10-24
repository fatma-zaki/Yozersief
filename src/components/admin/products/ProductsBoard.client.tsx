"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createServiceAction,
  saveProductAction,
  setProductVisibilityAction,
} from "@/app/(dashboard)/dashboard/products/actions";
import { cn } from "@/lib/cn";
import type { AdminCatalogData, AdminProductView, CategoryKey } from "@/modules/catalog";
import { OPTION_CHOICES } from "@/modules/catalog/schemas";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, Switch, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import p from "./products.module.css";
import { ServiceDrawer, type ServiceDraft, type ServiceFailure } from "./ServiceDrawer.client";

/**
 * Products & services (brief B4, B10), from docs/design/Admin-Products.html. Data comes from
 * `getAdminCatalog`; saving and the visibility switch run on the server, then the page refreshes.
 */

type Product = AdminProductView;
/** What the drawer edits; `id` is null for «منتج جديد». */
type Draft = Omit<Product, "id"> & { id: number | null };
type OptKey = "colors" | "sizes" | "places";
type SaveFailure = { error: string; nameError: boolean };

const label = (key: OptKey, value: string) =>
  OPTION_CHOICES[key].find((o) => o.value === value)?.label ?? value;

export function ProductsBoard({ data }: { data: AdminCatalogData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // A flipped switch shows at once; the refreshed data then takes over.
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const [drawer, setDrawer] = useState<{ mode: "new" | "edit"; n: number; draft: Draft } | null>(
    null,
  );
  const [serviceOpen, setServiceOpen] = useState(false);
  const { toast, flash, hide } = useFlash();
  // Products belong to the B4 categories; a dashboard service has no product types.
  const productCategories = data.categories.filter((c) => !c.service);

  const catName = new Map(data.categories.map((c) => [c.key, c.name]));
  const items = data.products.map((x) =>
    x.id in pending ? { ...x, visible: pending[x.id] ?? x.visible } : x,
  );
  const query = q.trim();
  const list = items.filter(
    (x) => (cat === "all" || x.categoryKey === cat) && (!query || x.name.includes(query)),
  );
  const visible = items.filter((x) => x.visible).length;
  const stats = [
    { n: items.length, label: "منتج وخدمة", icon: P.grid },
    { n: visible, label: "ظاهرة في الموقع", icon: P.eye },
    { n: items.length - visible, label: "مخفية مؤقتًا", icon: P.eyeOff },
  ];
  const cats: [CategoryKey | "all", string][] = [
    ["all", `الكل · ${items.length}`],
    ...data.categories.map((c) => [c.key, c.name] as [CategoryKey, string]),
  ];

  const toggle = (x: Product) => {
    const next = !x.visible;
    setPending((all) => ({ ...all, [x.id]: next }));
    startTransition(async () => {
      const result = await setProductVisibilityAction({ id: x.id, visible: next });
      if (result.ok) {
        flash(next ? `أصبح «${x.name}» ظاهر في الموقع` : `أُخفي «${x.name}» من الموقع`);
        router.refresh();
      } else {
        flash(result.error);
      }
      setPending((all) => {
        const rest = { ...all };
        delete rest[x.id];
        return rest;
      });
    });
  };

  /** Resolves to what went wrong, or null once saved. */
  const save = async (d: Draft): Promise<SaveFailure | null> => {
    const result = await saveProductAction({
      id: d.id,
      name: d.name,
      categoryKey: d.categoryKey,
      description: d.desc,
      colors: d.colors,
      sizes: d.sizes,
      places: d.places,
      visible: d.visible,
    });
    if (!result.ok) return { error: result.error, nameError: Boolean(result.fieldErrors?.name) };
    setDrawer(null);
    flash(
      result.data.created ? `أُضيف «${result.data.name}»` : `حُفظت تعديلات «${result.data.name}»`,
    );
    router.refresh();
    return null;
  };

  const saveService = async (d: ServiceDraft): Promise<ServiceFailure | null> => {
    const result = await createServiceAction(d);
    if (!result.ok) {
      const field = result.fieldErrors?.name
        ? "name"
        : result.fieldErrors?.description
          ? "description"
          : null;
      return { error: result.error, field };
    }
    setServiceOpen(false);
    flash(
      d.visible
        ? `أُضيفت خدمة «${result.data.name}» وأصبحت ظاهرة في الموقع`
        : `أُضيفت خدمة «${result.data.name}» (مخفية)`,
    );
    router.refresh();
    return null;
  };

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader title="الخدمات والمنتجات" subtitle="ما يظهر للعملاء في الموقع وفي منشئ الطلب">
        <label
          style={{ position: "relative", display: "flex", alignItems: "center", flex: "0 1 280px" }}
        >
          <span className={s.srOnly}>بحث في المنتجات</span>
          <Ic
            d={P.search}
            size={18}
            style={{ position: "absolute", right: 14, color: "var(--muted)" }}
          />
          <input
            className={k.fld}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اسم المنتج"
            style={{ borderRadius: 999, paddingRight: 42 }}
          />
        </label>
        <button
          className={cn(k.btn, k.cta)}
          type="button"
          onClick={() =>
            setDrawer({
              mode: "new",
              n: Date.now(),
              draft: {
                id: null,
                name: "",
                categoryKey: productCategories[0]?.key ?? "wear",
                img: "/images/admin/file-preview.png",
                desc: "",
                colors: [],
                sizes: [],
                places: [],
                visible: true,
              },
            })
          }
          style={{ minHeight: 46, padding: "8px 22px", borderRadius: 999, fontSize: 15 }}
        >
          <Ic d={P.plus} size={18} stroke={2.4} />
          إضافة منتج
        </button>
        <button
          className={cn(k.btn, k.soft)}
          type="button"
          onClick={() => setServiceOpen(true)}
          style={{ minHeight: 46, padding: "8px 22px", borderRadius: 999, fontSize: 15 }}
        >
          <Ic d={P.plus} size={18} stroke={2.4} />
          إضافة خدمة
        </button>
      </KitHeader>

      <section
        className={cn(s.up, s.d1)}
        aria-label="ملخص"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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

      <div
        className={cn(s.up, s.d2)}
        role="group"
        aria-label="تصنيف"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {cats.map(([key, name]) => (
          <button
            key={key}
            className={cn(k.btn, k.chip, cat === key ? k.chipOn : k.chipOff)}
            type="button"
            aria-pressed={cat === key}
            onClick={() => setCat(key)}
          >
            {name}
          </button>
        ))}
      </div>

      <section
        className={cn(s.up, s.d3)}
        aria-label="المنتجات"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 16,
        }}
      >
        {list.map((x) => {
          const tags = [
            x.colors.length ? x.colors.map((v) => label("colors", v)).join(" · ") : "",
            x.sizes.length ? `${x.sizes[0]}–${x.sizes[x.sizes.length - 1]}` : "",
            x.places.length ? `طباعة: ${x.places.map((v) => label("places", v)).join("، ")}` : "",
          ].filter(Boolean);
          return (
            <article key={x.id} className={cn(k.card, p.pcard, k.lift, !x.visible && p.off)}>
              <div className={p.pimg}>
                <Image src={x.img} alt={x.name} fill sizes="(max-width: 700px) 100vw, 320px" />
                <span
                  className={cn(k.badge, k.bGlass)}
                  style={{ position: "absolute", top: 10, right: 10 }}
                >
                  {catName.get(x.categoryKey)}
                </span>
                <span
                  className={cn(k.badge, x.visible ? k.bOk : k.bOff)}
                  style={{ position: "absolute", top: 10, left: 10 }}
                >
                  {x.visible ? "ظاهر" : "مخفي"}
                </span>
              </div>
              <div
                style={{
                  padding: "14px 16px 6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flexGrow: 1,
                }}
              >
                <h2 className={k.h2} style={{ fontSize: 16, lineHeight: "26px" }}>
                  {x.name}
                </h2>
                <p className={k.muted} style={{ margin: 0, fontSize: 13, lineHeight: "21px" }}>
                  {x.desc}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {tags.map((g) => (
                    <span key={g} className={k.tag}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: "10px 16px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <Switch
                  on={x.visible}
                  onToggle={() => toggle(x)}
                  label={`إظهار ${x.name} في الموقع`}
                />
                <span style={{ flexGrow: 1, fontSize: 13, fontWeight: 700 }}>ظاهر في الموقع</span>
                <button
                  className={cn(k.btn, k.soft)}
                  type="button"
                  onClick={() => setDrawer({ mode: "edit", n: x.id, draft: structuredClone(x) })}
                  style={{ minHeight: 36, padding: "2px 14px", borderRadius: 999, fontSize: 13 }}
                >
                  <Ic d={P.pen} size={15} />
                  تعديل
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {list.length === 0 ? (
        <div
          className={k.card}
          style={{
            padding: "36px 16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <strong>{items.length ? "لا توجد منتجات تطابق هذا البحث" : "لا توجد منتجات بعد"}</strong>
          {items.length ? (
            <button
              className={cn(k.btn, k.soft)}
              type="button"
              onClick={() => {
                setQ("");
                setCat("all");
              }}
              style={{ minHeight: 42, padding: "4px 18px", borderRadius: 999 }}
            >
              مسح البحث
            </button>
          ) : null}
        </div>
      ) : null}

      <p
        className={k.tint}
        style={{ margin: 0, padding: "10px 16px", fontSize: 13, lineHeight: "22px" }}
      >
        لا تظهر الأسعار للعملاء. يُسعَّر كل طلب بعد المراجعة حسب الكمية والتصميم.
      </p>

      {drawer ? (
        <ProductDrawer
          key={drawer.n}
          mode={drawer.mode}
          initial={drawer.draft}
          categories={productCategories}
          onClose={() => setDrawer(null)}
          onSave={save}
        />
      ) : null}
      {serviceOpen ? (
        <ServiceDrawer onClose={() => setServiceOpen(false)} onSave={saveService} />
      ) : null}
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}

function ProductDrawer({
  mode,
  initial,
  categories,
  onClose,
  onSave,
}: {
  mode: "new" | "edit";
  initial: Draft;
  categories: AdminCatalogData["categories"];
  onClose: () => void;
  onSave: (d: Draft) => Promise<SaveFailure | null>;
}) {
  const [d, setD] = useState(initial);
  const [nameErr, setNameErr] = useState("");
  const [formErr, setFormErr] = useState("");
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

  const opts = (key: OptKey) =>
    OPTION_CHOICES[key].map((o) => {
      const picked: readonly string[] = d[key];
      const on = picked.includes(o.value);
      return (
        <label key={o.value} className={cn(k.opt, k.btn, on ? k.chipOn : k.chipOff)}>
          <input
            type="checkbox"
            checked={on}
            onChange={() =>
              setD((x) => {
                const values: readonly string[] = x[key];
                return {
                  ...x,
                  [key]: on ? values.filter((v) => v !== o.value) : [...values, o.value],
                };
              })
            }
          />
          {o.label}
        </label>
      );
    });

  const group = (legend: string, children: React.ReactNode, ltr = false) => (
    <fieldset
      style={{ margin: 0, padding: 0, border: 0, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <legend className={k.lbl} style={{ padding: 0, marginBottom: 8 }}>
        {legend}
      </legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} dir={ltr ? "ltr" : undefined}>
        {children}
      </div>
    </fieldset>
  );

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
        aria-labelledby="dr-h"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (!d.name.trim()) {
            setNameErr("اكتب اسم المنتج.");
            return;
          }
          setFormErr("");
          startTransition(async () => {
            const failed = await onSave(d);
            if (!failed) return;
            if (failed.nameError) setNameErr(failed.error);
            else setFormErr(failed.error);
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
          <h2 id="dr-h" ref={heading} tabIndex={-1} className={k.h1} style={{ fontSize: 21 }}>
            {mode === "new" ? "منتج جديد" : "تعديل المنتج"}
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
        <label
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 12,
            borderRadius: 18,
            border: "1.5px dashed var(--field-bd)",
            background: "var(--tint)",
            cursor: "pointer",
          }}
        >
          {/* Photo upload is not wired yet: products keep their seeded or category photo. */}
          <input
            type="file"
            accept="image/*"
            disabled
            style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
          />
          <Image
            width={72}
            height={72}
            src={d.img}
            alt=""
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              objectFit: "cover",
              background: "var(--img-bg)",
            }}
          />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: 14 }}>صورة المنتج</strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              اختر صورة جديدة (JPG أو PNG)
            </span>
          </span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="d-name">
            اسم المنتج
          </label>
          <input
            className={k.fld}
            id="d-name"
            type="text"
            value={d.name}
            onChange={(e) => {
              setD({ ...d, name: e.target.value });
              setNameErr("");
            }}
            aria-invalid={nameErr ? true : undefined}
          />
          {nameErr ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warn-ink)" }}>
              {nameErr}
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="d-cat">
            التصنيف
          </label>
          <select
            className={k.fld}
            id="d-cat"
            value={d.categoryKey}
            onChange={(e) => setD({ ...d, categoryKey: e.target.value as CategoryKey })}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className={k.lbl} htmlFor="d-desc">
            وصف قصير
          </label>
          <textarea
            className={k.fld}
            id="d-desc"
            rows={2}
            value={d.desc}
            onChange={(e) => setD({ ...d, desc: e.target.value })}
            style={{ lineHeight: "24px" }}
          />
        </div>
        {group("الألوان المتاحة", opts("colors"))}
        {group("المقاسات", opts("sizes"), true)}
        {group("أماكن الطباعة", opts("places"))}
        <div
          className={k.tint}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
        >
          <Switch
            on={d.visible}
            onToggle={() => setD({ ...d, visible: !d.visible })}
            labelledBy="d-vis"
          />
          <span id="d-vis" style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: 14 }}>يظهر في الموقع ومنشئ الطلب</strong>
            <span className={k.muted} style={{ fontSize: 12 }}>
              يمكنك إخفاؤه مؤقتًا دون حذفه
            </span>
          </span>
        </div>
        {formErr ? (
          <p
            role="alert"
            style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--warn-ink)" }}
          >
            {formErr}
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
            {mode === "new" ? "إضافة المنتج" : "حفظ التعديلات"}
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
