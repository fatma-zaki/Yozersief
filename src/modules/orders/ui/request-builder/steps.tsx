import {
  Building2,
  Check,
  CircleCheck,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Pencil,
  Square,
  SquareCheck,
  Store,
  Trash2,
  TriangleAlert,
  Truck,
  Upload,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import type { PublicCategory } from "@/modules/catalog";
import { WEAR_SIZES } from "@/modules/catalog/schemas";
import { ar, t } from "@/i18n/ar";
import { cn } from "@/lib/cn";
import { normalizeEgyptianMobile } from "@/lib/phone";
import {
  acceptedExtensions,
  bulkOptionsFor,
  COLORS,
  hasSizeSplit,
  isNamesSheet,
  isOrg,
  PRINT_PLACES,
  productLabel,
  sizeSum,
  STICKER_SHAPES,
  toDecimal,
  toInt,
  type Check as ReadinessCheck,
  type RequestDraft,
} from "../../domain/request";
import {
  ChipOption,
  decimalOnly,
  fieldAria,
  FieldBox,
  OptionCard,
  QtyInput,
  SwitchCard,
} from "./parts";
import s from "./builder.module.css";

const b = ar.order.builder;

export type StepProps = {
  d: RequestDraft;
  set: (patch: Partial<RequestDraft>) => void;
  /** Error message per check id; empty until the customer tries to continue. */
  e: Record<string, string>;
};

/**
 * What the catalog offers right now (dashboard → products): the categories to pick from, each
 * with its visible product types, plus display names by key for the checklist and review.
 */
export type BuilderCatalog = {
  categories: readonly PublicCategory[];
  productNames: Readonly<Record<string, string>>;
  categoryNames: Readonly<Record<string, string>>;
};

export function builderCatalog(categories: readonly PublicCategory[]): BuilderCatalog {
  return {
    categories,
    productNames: Object.fromEntries(
      categories.flatMap((c) => c.products.map((p) => [p.key, p.name] as const)),
    ),
    categoryNames: Object.fromEntries(categories.map((c) => [c.key, c.name] as const)),
  };
}

function Legend({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <legend className={cn(s.lbl, "mb-3 p-0")}>
      {children}
      {hint ? <span className={cn(s.muted, "font-medium")}> {hint}</span> : null}
    </legend>
  );
}

/* ───────────── Step 1: type & product ───────────── */

export function StepType({ d, set, e, catalog }: StepProps & { catalog: BuilderCatalog }) {
  const icons = { person: <User />, biz: <Building2 />, group: <Users /> };
  return (
    <div className={cn(s.fade, "flex flex-col gap-[26px]")}>
      <fieldset id="f-ctype" tabIndex={-1} className="m-0 border-0 p-0">
        <Legend>{b.whoFor}</Legend>
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {(["person", "biz", "group"] as const).map((k) => (
            <OptionCard
              key={k}
              name="ctype"
              checked={d.ctype === k}
              onSelect={() => set({ ctype: k })}
              icon={icons[k]}
              title={b.ctypes[k].t}
              desc={b.ctypes[k].d}
            />
          ))}
        </div>
        {e.ctype ? <p className={cn(s.err, "mt-2")}>{e.ctype}</p> : null}
      </fieldset>

      {d.ctype === "biz" || d.ctype === "group" ? (
        <div className={cn(s.tint, s.pop, "flex items-start gap-3 px-4 py-3.5")}>
          <span aria-hidden="true" className={cn(s.tile, "size-10 [&_svg]:size-5")}>
            <ClipboardCheck strokeWidth={1.75} />
          </span>
          <span className="text-sm leading-6">
            <strong className={s.strong}>{t(b.orgPathLead, { org: b.orgWord[d.ctype] })}</strong>{" "}
            {b.orgPathNote}
          </span>
        </div>
      ) : null}

      <fieldset id="f-cat" tabIndex={-1} className="m-0 border-0 p-0">
        <Legend>{b.whatPrint}</Legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4">
          {catalog.categories.map(({ key: k, name, img }) => (
            <label key={k} className={s.cat} data-on={d.cat === k}>
              <input
                className={s.srInput}
                type="radio"
                name="cat"
                value={k}
                checked={d.cat === k}
                onChange={() => set({ cat: k })}
              />
              <span className={cn(s.cimg, "h-[104px] sm:h-[130px]")}>
                <Image src={img} alt="" fill sizes="(min-width: 640px) 200px, 45vw" />
              </span>
              <span aria-hidden="true" className={s.tick}>
                <Check className="size-4" strokeWidth={2.5} />
              </span>
              <span
                className={cn(
                  s.strong,
                  "px-1.5 pt-1 text-[15px] leading-6 font-extrabold sm:text-base sm:leading-[26px]",
                )}
              >
                {name}
              </span>
              <span className={cn(s.muted, "px-1.5 text-[13px] leading-5")}>{b.cats[k].d}</span>
            </label>
          ))}
        </div>
        {e.cat ? <p className={cn(s.err, "mt-2")}>{e.cat}</p> : null}
      </fieldset>

      <p className={cn(s.tint, "m-0 px-4 py-3 text-sm leading-6")}>
        {b.galleryNoteStart}{" "}
        <Link href="/gallery" className={cn(s.accent, "font-bold underline")}>
          {b.galleryNoteLink}
        </Link>
        {b.galleryNoteEnd}
      </p>
    </div>
  );
}

/* ───────────── Step 2: details ───────────── */

export function StepDetails({ d, set, e, catalog }: StepProps & { catalog: BuilderCatalog }) {
  const productTypes = catalog.categories.find((c) => c.key === d.cat)?.products ?? [];
  const qty = toInt(d.qty);
  const sum = sizeSum(d.sizes);
  const sumOk = qty > 0 && sum === qty;
  const sumText =
    qty === 0
      ? b.sumNoQty
      : sumOk
        ? t(b.sumOk, { sum })
        : sum < qty
          ? t(b.sumLess, { sum, qty, diff: qty - sum })
          : t(b.sumMore, { sum, qty, diff: sum - qty });
  const org = isOrg(d);

  const qtyField = (label: string, hint?: string) => (
    <FieldBox id="f-qty" label={label} hint={hint} error={e.qty}>
      <QtyInput
        id="f-qty"
        value={d.qty}
        onChange={(qty) => set({ qty })}
        invalid={Boolean(e.qty)}
        describedBy={
          [hint ? "f-qty-hint" : "", e.qty ? "f-qty-err" : ""].filter(Boolean).join(" ") ||
          undefined
        }
      />
    </FieldBox>
  );

  return (
    <div className={cn(s.fade, "flex flex-col gap-6")}>
      {d.cat === "wear" || d.cat === "mug" ? (
        <fieldset id="f-prod" tabIndex={-1} className="m-0 border-0 p-0">
          <Legend>{b.productType}</Legend>
          <div className="flex flex-wrap gap-2">
            {productTypes.map((p) => (
              <ChipOption
                key={p.key}
                type="radio"
                name="prod"
                checked={d.prod === p.key}
                onChange={() => set({ prod: p.key })}
              >
                {p.name}
              </ChipOption>
            ))}
          </div>
          {e.prod ? <p className={cn(s.err, "mt-2")}>{e.prod}</p> : null}
        </fieldset>
      ) : null}

      {d.cat === "wear" ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldBox id="f-color" label={b.color} hint={b.colorHint} error={e.color}>
              <select
                className={s.fld}
                {...fieldAria("f-color", e.color, true)}
                value={d.color}
                onChange={(ev) => set({ color: ev.target.value as RequestDraft["color"] })}
              >
                <option value="">{b.colorPick}</option>
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c === "other" ? b.colorOtherOption : b.colors[c]}
                  </option>
                ))}
              </select>
            </FieldBox>
            {qtyField(b.totalQty, b.totalQtyHint)}
          </div>

          {hasSizeSplit(d) ? (
            <fieldset
              id="f-sizes"
              tabIndex={-1}
              aria-describedby="h-sizes"
              className={cn(s.tint, "m-0 border-0 px-4 pt-4 pb-5 sm:px-5")}
            >
              <legend className={cn(s.lbl, "float-right mb-3.5 w-full p-0")}>{b.sizes}</legend>
              <div className="clear-both flex flex-col gap-2 sm:grid sm:grid-cols-5 sm:gap-3">
                {WEAR_SIZES.map((size) => (
                  <div
                    key={size}
                    className="flex items-center justify-between gap-3 sm:flex-col sm:items-stretch sm:gap-1.5"
                  >
                    <label htmlFor={`f-size-${size}`} className={cn(s.sizeTag, "sm:self-center")}>
                      {size}
                    </label>
                    <div className="w-44 sm:w-auto">
                      <QtyInput
                        id={`f-size-${size}`}
                        value={d.sizes[size]}
                        onChange={(v) => set({ sizes: { ...d.sizes, [size]: v } })}
                        label={size}
                        big
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p id="h-sizes" aria-live="polite" className={cn(s.sum, sumOk ? s.sumOk : s.sumWarn)}>
                {sumOk ? (
                  <CircleCheck aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                ) : (
                  <TriangleAlert
                    aria-hidden="true"
                    className="size-5 shrink-0"
                    strokeWidth={1.75}
                  />
                )}
                <span>{sumText}</span>
              </p>
            </fieldset>
          ) : null}

          <fieldset id="f-place" tabIndex={-1} className="m-0 border-0 p-0">
            <Legend hint={b.placesHint}>{b.places}</Legend>
            <div className="flex flex-wrap gap-2">
              {PRINT_PLACES.filter((p) => d.prod !== "cap" || p !== "sleeve").map((p) => {
                const on = d.places.includes(p);
                return (
                  <ChipOption
                    key={p}
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      set({ places: on ? d.places.filter((x) => x !== p) : [...d.places, p] })
                    }
                  >
                    {on ? (
                      <SquareCheck aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    ) : (
                      <Square aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    )}
                    {b.placeLabels[p]}
                  </ChipOption>
                );
              })}
            </div>
            {e.place ? <p className={cn(s.err, "mt-2")}>{e.place}</p> : null}
          </fieldset>
        </div>
      ) : null}

      {d.cat === "mug" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {qtyField(b.qty)}
          <FieldBox id="f-text" label={b.mugText} optional>
            <input
              className={s.fld}
              id="f-text"
              type="text"
              value={d.text}
              placeholder={b.mugTextPh}
              onChange={(ev) => set({ text: ev.target.value })}
            />
          </FieldBox>
        </div>
      ) : null}

      {d.cat === "phone" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldBox id="f-model" label={b.phoneModel} hint={b.phoneModelHint} error={e.model}>
            <input
              className={s.fld}
              {...fieldAria("f-model", e.model, true)}
              type="text"
              autoComplete="off"
              value={d.model}
              placeholder={b.phoneModelPh}
              onChange={(ev) => set({ model: ev.target.value })}
            />
          </FieldBox>
          {qtyField(b.qty)}
          <FieldBox id="f-text" label={b.phoneText} optional className="sm:col-span-2">
            <input
              className={s.fld}
              id="f-text"
              type="text"
              value={d.text}
              onChange={(ev) => set({ text: ev.target.value })}
            />
          </FieldBox>
        </div>
      ) : null}

      {d.cat === "sticker" ? (
        <div className="flex flex-col gap-6">
          <fieldset id="f-dims" tabIndex={-1} className="m-0 border-0 p-0">
            <Legend>{b.dims}</Legend>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["f-w", b.width, "w"],
                  ["f-h", b.height, "h"],
                ] as const
              ).map(([id, label, key]) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="text-sm font-bold">
                    {label}
                  </label>
                  <input
                    className={s.fld}
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={d[key]}
                    aria-invalid={(e.dims && !(toDecimal(d[key]) > 0)) || undefined}
                    onChange={(ev) => set({ [key]: decimalOnly(ev.target.value) })}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-unit" className="text-sm font-bold">
                  {b.unit}
                </label>
                <select
                  className={s.fld}
                  id="f-unit"
                  value={d.unit}
                  aria-invalid={(e.dims && !d.unit) || undefined}
                  onChange={(ev) => set({ unit: ev.target.value as RequestDraft["unit"] })}
                >
                  <option value="">{b.unitPick}</option>
                  <option value="cm">{b.units.cm}</option>
                  <option value="mm">{b.units.mm}</option>
                </select>
              </div>
            </div>
            {e.dims ? <p className={cn(s.err, "mt-2")}>{e.dims}</p> : null}
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldBox id="f-shape" label={b.shape} error={e.shape}>
              <select
                className={s.fld}
                {...fieldAria("f-shape", e.shape)}
                value={d.shape}
                onChange={(ev) => set({ shape: ev.target.value as RequestDraft["shape"] })}
              >
                <option value="">{b.shapePick}</option>
                {STICKER_SHAPES.map((k) => (
                  <option key={k} value={k}>
                    {b.shapes[k]}
                  </option>
                ))}
              </select>
            </FieldBox>
            {qtyField(b.qty)}
            <FieldBox id="f-use" label={b.usage} optional className="sm:col-span-2">
              <input
                className={s.fld}
                id="f-use"
                type="text"
                value={d.use}
                placeholder={b.usagePh}
                onChange={(ev) => set({ use: ev.target.value })}
              />
            </FieldBox>
          </div>
        </div>
      ) : null}

      {d.cat === "custom" ? (
        <FieldBox id="f-desc" label={b.idea} hint={b.ideaHint} error={e.desc}>
          <textarea
            className={cn(s.fld, "resize-y")}
            {...fieldAria("f-desc", e.desc, true)}
            rows={5}
            value={d.desc}
            onChange={(ev) => set({ desc: ev.target.value })}
          />
        </FieldBox>
      ) : null}

      {d.ctype === "person" && qty >= 30 ? (
        <div
          className={cn(
            s.tint,
            s.fade,
            "flex flex-wrap items-center gap-2.5 px-4 py-3 text-sm leading-6",
          )}
        >
          <span className="flex-[1_1_260px]">{b.bigQty}</span>
          <button
            type="button"
            className={cn(s.btn, s.soft, "min-h-10 px-4 text-[13px]")}
            onClick={() => set({ ctype: "biz" })}
          >
            {b.bigQtyAction}
          </button>
        </div>
      ) : null}

      {org ? (
        <fieldset id="f-bulk" className={cn(s.tint, "m-0 border-0 px-4 pt-4 pb-5 sm:px-5")}>
          <legend className={cn(s.lbl, "float-right mb-1 w-full p-0")}>{b.bulkTitle}</legend>
          <p className={cn(s.hint, "clear-both mb-3.5")}>{b.bulkHint}</p>
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {bulkOptionsFor(d.cat).map((k) => (
              <SwitchCard
                key={k}
                checked={d[k]}
                onChange={(on) => set({ [k]: on })}
                title={b.bulk[k].t}
                desc={b.bulk[k].d}
              />
            ))}
          </div>
          {d.batches ? (
            <div className={cn(s.fade, "mt-3.5")}>
              <FieldBox id="f-batch" label={b.batchNotes} error={e.batch}>
                <textarea
                  className={cn(s.fld, "resize-y")}
                  {...fieldAria("f-batch", e.batch)}
                  rows={2}
                  value={d.batchNotes}
                  placeholder={b.batchNotesPh}
                  onChange={(ev) => set({ batchNotes: ev.target.value })}
                />
              </FieldBox>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <FieldBox id="f-notes" label={b.notes} optional>
        <textarea
          className={cn(s.fld, "resize-y")}
          id="f-notes"
          rows={3}
          value={d.notes}
          onChange={(ev) => set({ notes: ev.target.value })}
        />
      </FieldBox>
    </div>
  );
}

/* ───────────── Step 3: design & files ───────────── */

function fileSize(bytes: number) {
  return bytes > 1_048_576
    ? t(b.mb, { n: (bytes / 1_048_576).toFixed(1) })
    : t(b.kb, { n: Math.max(1, Math.round(bytes / 1024)) });
}

export function StepFiles({
  d,
  set,
  e,
  onFiles,
  onRemove,
}: StepProps & {
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
}) {
  const perPiece = isOrg(d) && d.perPiece && bulkOptionsFor(d.cat).includes("perPiece");
  const hasSheet = d.files.some(isNamesSheet);
  return (
    <div className={cn(s.fade, "flex flex-col gap-[18px]")}>
      <label
        id="f-files"
        tabIndex={-1}
        className={cn(
          s.drop,
          "flex flex-col items-center gap-2.5 rounded-3xl px-6 py-[34px] text-center",
        )}
      >
        <input
          className={s.srInput}
          type="file"
          multiple
          accept={acceptedExtensions(perPiece)
            .map((x) => `.${x}`)
            .join(",")}
          onChange={onFiles}
          aria-describedby="h-files"
        />
        <span
          aria-hidden="true"
          className={cn(
            s.tile,
            s.floaty,
            "size-16 rounded-full shadow-[0_0_22px_rgb(126_232_199/0.45)] [&_svg]:size-6",
          )}
        >
          <Upload strokeWidth={1.75} />
        </span>
        <span className={cn(s.strong, "text-lg font-extrabold")}>{b.dropTitle}</span>
        <span id="h-files" className={cn(s.hint, "text-sm")}>
          {t(b.dropLimit, { types: perPiece ? b.dropTypesSheet : b.dropTypes })}
        </span>
      </label>

      {perPiece ? (
        <div className={cn(s.alert, s.fade, "font-semibold")}>
          <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="grow">
            {b.sheetAlert}{" "}
            <span className={cn("font-extrabold", hasSheet && s.accent)}>
              {hasSheet ? b.sheetDone : b.sheetMissing}
            </span>
          </span>
        </div>
      ) : null}

      {d.files.length ? (
        <ul
          aria-label={b.filesList}
          aria-live="polite"
          className="m-0 flex list-none flex-col gap-2.5 p-0"
        >
          {d.files.map((f) => (
            <li
              key={f.id}
              className={cn(s.card, s.pop, "flex items-center gap-3.5 rounded-[20px] p-3")}
            >
              {f.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img
                  src={f.thumb}
                  alt=""
                  className="size-14 shrink-0 rounded-[14px] object-cover"
                />
              ) : (
                <span aria-hidden="true" className={cn(s.tile, "size-14 [&_svg]:size-6")}>
                  <FileText strokeWidth={1.75} />
                </span>
              )}
              <div className="flex min-w-0 grow flex-col gap-1">
                <span
                  dir="ltr"
                  className={cn(s.strong, "truncate text-right text-[15px] font-bold")}
                >
                  {f.name}
                </span>
                <span
                  className={cn(
                    "text-[13px] leading-5",
                    f.status === "failed"
                      ? cn(s.warnText, "font-bold")
                      : cn(s.accent, "font-semibold"),
                  )}
                >
                  {f.status === "failed" ? f.error : t(b.uploaded, { size: fileSize(f.size) })}
                </span>
              </div>
              <button
                type="button"
                className={cn(s.btn, s.soft, "size-10 shrink-0 [&_svg]:size-[18px]")}
                onClick={() => onRemove(f.id)}
                aria-label={t(b.remove, { name: f.name })}
              >
                <Trash2 aria-hidden="true" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={cn(s.tint, "m-0 px-4 py-3 text-sm leading-6")}>{b.fileNote}</p>

      <SwitchCard
        id="f-help"
        checked={d.help}
        onChange={(help) => set({ help })}
        title={b.help}
        desc={b.helpHint}
      />
      {e.art || e.sheet ? <p className={cn(s.err, "m-0")}>{e.art || e.sheet}</p> : null}

      <FieldBox id="f-artnotes" label={b.artNotes} optional>
        <textarea
          className={cn(s.fld, "resize-y")}
          id="f-artnotes"
          rows={3}
          value={d.artNotes}
          placeholder={b.artNotesPh}
          onChange={(ev) => set({ artNotes: ev.target.value })}
        />
      </FieldBox>
    </div>
  );
}

/* ───────────── Step 4: contact & receipt ───────────── */

export function StepContact({ d, set, e, today }: StepProps & { today: string }) {
  const org = d.ctype === "biz" || d.ctype === "group" ? d.ctype : null;
  return (
    <div className={cn(s.fade, "flex flex-col gap-6")}>
      {org ? (
        <fieldset className={cn(s.tint, "m-0 border-0 px-4 pt-4 pb-5 sm:px-5")}>
          <legend className={cn(s.lbl, "float-right mb-3.5 w-full p-0")}>
            {t(b.orgData, { org: b.orgOne[org] })}
          </legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <FieldBox id="f-org" label={b.orgName[org]} error={e.org}>
              <input
                className={s.fld}
                {...fieldAria("f-org", e.org)}
                type="text"
                autoComplete="organization"
                value={d.org}
                onChange={(ev) => set({ org: ev.target.value })}
              />
            </FieldBox>
            <FieldBox id="f-role" label={b.role} optional>
              <input
                className={s.fld}
                id="f-role"
                type="text"
                autoComplete="organization-title"
                value={d.role}
                placeholder={b.rolePh[org]}
                onChange={(ev) => set({ role: ev.target.value })}
              />
            </FieldBox>
            <SwitchCard
              className="sm:col-span-2"
              checked={d.invoice}
              onChange={(invoice) => set({ invoice })}
              title={t(b.invoice, { org: b.orgOne[org] })}
              desc={b.invoiceHint}
            />
            {d.invoice ? (
              <div className={cn(s.fade, "flex flex-col gap-2 sm:col-span-2")}>
                <label className={s.lbl} htmlFor="f-tax">
                  {b.taxId} <span className={cn(s.muted, "font-medium")}>{b.taxIdOptional}</span>
                </label>
                <input
                  className={cn(s.fld, "text-right")}
                  id="f-tax"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={d.taxId}
                  onChange={(ev) => set({ taxId: ev.target.value })}
                />
              </div>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <FieldBox id="f-name" label={org ? b.contactName : b.name} error={e.name}>
          <input
            className={s.fld}
            {...fieldAria("f-name", e.name)}
            type="text"
            autoComplete="name"
            value={d.name}
            onChange={(ev) => set({ name: ev.target.value })}
          />
        </FieldBox>
        <FieldBox id="f-phone" label={b.phone} hint={b.phoneHint} error={e.phone}>
          <input
            className={cn(s.fld, "text-right")}
            {...fieldAria("f-phone", e.phone, true)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="01xxxxxxxxx"
            value={d.phone}
            onChange={(ev) => set({ phone: ev.target.value })}
            onBlur={() => {
              const normal = normalizeEgyptianMobile(d.phone);
              if (normal && normal !== d.phone) set({ phone: normal });
            }}
          />
        </FieldBox>
        <FieldBox id="f-email" label={b.email} optional error={e.email}>
          <input
            className={cn(s.fld, "text-right")}
            {...fieldAria("f-email", e.email)}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={d.email}
            onChange={(ev) => set({ email: ev.target.value })}
          />
        </FieldBox>
        <FieldBox id="f-date" label={b.date} optional hint={b.dateHint} error={e.date}>
          <input
            className={s.fld}
            {...fieldAria("f-date", e.date, true)}
            type="date"
            min={today}
            value={d.date}
            onChange={(ev) => set({ date: ev.target.value })}
          />
        </FieldBox>
      </div>

      <fieldset id="f-receipt" tabIndex={-1} className="m-0 border-0 p-0">
        <Legend>{b.receipt}</Legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["pickup", "delivery"] as const).map((k) => (
            <OptionCard
              key={k}
              name="receipt"
              checked={d.receipt === k}
              onSelect={() => set({ receipt: k })}
              icon={k === "pickup" ? <Store /> : <Truck />}
              title={b.receipts[k].t}
              desc={b.receipts[k].d}
            />
          ))}
        </div>
        {e.receipt ? <p className={cn(s.err, "mt-2")}>{e.receipt}</p> : null}
      </fieldset>

      {d.receipt === "delivery" ? (
        <FieldBox id="f-address" label={b.address} error={e.address} className={s.fade}>
          <textarea
            className={cn(s.fld, "resize-y")}
            {...fieldAria("f-address", e.address)}
            rows={2}
            autoComplete="street-address"
            value={d.address}
            placeholder={b.addressPh}
            onChange={(ev) => set({ address: ev.target.value })}
          />
        </FieldBox>
      ) : null}
    </div>
  );
}

/* ───────────── Step 5: review ───────────── */

type Row = { k: string; v: string; missing?: boolean };

function reviewSections(
  d: RequestDraft,
  checks: readonly ReadinessCheck[],
  catalog: BuilderCatalog,
) {
  const r = b.review;
  const row = (k: string, v: string, missing = false): Row => ({ k, v, missing: missing || !v });
  const plain = (k: string, v: string): Row => ({ k, v });
  const ok = (id: string) => checks.find((c) => c.id === id)?.status === "ok";
  const qty = toInt(d.qty);
  const sum = sizeSum(d.sizes);
  const pieces = qty ? t(r.pieces, { n: qty }) : "";
  const specs: Row[] = [];
  if (d.cat === "wear") {
    specs.push(row(r.type, d.prod ? productLabel(d.prod, catalog.productNames) : ""));
    specs.push(row(r.color, d.color ? b.colors[d.color] : ""));
    specs.push(row(r.qty, pieces));
    if (hasSizeSplit(d)) {
      const list = WEAR_SIZES.filter((z) => toInt(d.sizes[z]) > 0)
        .map((z) => `${z}: ${toInt(d.sizes[z])}`)
        .join(" · ");
      specs.push(
        row(r.sizes, list + (ok("sizes") ? "" : t(r.sizesSum, { sum, qty })), !ok("sizes")),
      );
    }
    specs.push(row(r.places, d.places.map((p) => b.placeLabels[p]).join("، ")));
  } else if (d.cat === "mug") {
    specs.push(row(r.type, d.prod ? productLabel(d.prod, catalog.productNames) : ""));
    specs.push(row(r.qty, pieces));
    specs.push(plain(r.text, d.text.trim() || b.none));
  } else if (d.cat === "phone") {
    specs.push(row(r.model, d.model.trim()));
    specs.push(row(r.qty, pieces));
    if (d.text.trim()) specs.push(plain(r.text, d.text.trim()));
  } else if (d.cat === "sticker") {
    specs.push(row(r.dims, ok("dims") ? (checks.find((c) => c.id === "dims")?.msg ?? "") : ""));
    specs.push(row(r.shape, d.shape ? b.shapes[d.shape] : ""));
    specs.push(row(r.qty, pieces));
    if (d.use.trim()) specs.push(plain(r.usage, d.use.trim()));
  } else if (d.cat === "custom") {
    specs.push(row(r.idea, ok("desc") ? d.desc.trim() : ""));
  }
  const org = d.ctype === "biz" || d.ctype === "group" ? d.ctype : null;
  if (org) {
    const bulk = [
      d.sample ? r.bulkSample : "",
      d.perPiece && bulkOptionsFor(d.cat).includes("perPiece") ? r.bulkPerPiece : "",
      d.batches ? r.bulkBatches : "",
    ].filter(Boolean);
    specs.push(plain(r.bulk, bulk.join("، ") || r.bulkNone));
    if (d.batches) specs.push(row(r.batches, ok("batch") ? d.batchNotes.trim() : ""));
  }
  if (d.notes.trim()) specs.push(plain(r.notes, d.notes.trim()));

  const files = d.files.filter((f) => f.status === "done").map((f) => f.name);
  const contact: Row[] = [];
  if (org) {
    contact.push(row(b.orgOne[org], ok("org") ? d.org.trim() : ""));
    contact.push(plain(r.role, d.role.trim() || b.none));
    contact.push(plain(r.invoice, d.invoice ? b.yes + (d.taxId ? ` (${d.taxId})` : "") : b.no));
  }
  contact.push(row(org ? r.contact : r.name, ok("name") ? d.name.trim() : ""));
  contact.push(row(r.phone, ok("phone") ? (checks.find((c) => c.id === "phone")?.msg ?? "") : ""));
  contact.push(plain(r.email, d.email.trim() || b.none));
  contact.push(row(r.receipt, d.receipt ? b.receipts[d.receipt].t : ""));
  if (d.receipt === "delivery") contact.push(row(r.address, ok("address") ? d.address.trim() : ""));
  contact.push(plain(r.date, d.date || b.notSet));

  return [
    {
      title: b.titles[0],
      step: 1 as const,
      rows: [
        row(r.orderFor, d.ctype ? b.ctypes[d.ctype].t : ""),
        row(r.product, d.cat ? (catalog.categoryNames[d.cat] ?? b.cats[d.cat].t) : ""),
      ],
    },
    {
      title: b.stepShort[1],
      step: 2 as const,
      rows: specs.length ? specs : [row(b.stepShort[1], "")],
    },
    {
      title: b.titles[2],
      step: 3 as const,
      rows: [
        row(r.files, files.join("، ") || (d.help ? r.filesNoneHelp : ""), !ok("art")),
        plain(r.help, d.help ? b.yes : b.no),
        ...(d.artNotes.trim() ? [plain(r.artNotes, d.artNotes.trim())] : []),
      ],
    },
    { title: b.titles[3], step: 4 as const, rows: contact },
  ];
}

export function StepReview({
  d,
  checks,
  onEdit,
  submitError,
  catalog,
}: {
  catalog: BuilderCatalog;
  d: RequestDraft;
  checks: readonly ReadinessCheck[];
  onEdit: (step: 1 | 2 | 3 | 4) => void;
  submitError: string | null;
}) {
  return (
    <div className={cn(s.fade, "flex flex-col gap-3.5")}>
      {reviewSections(d, checks, catalog).map((sec, i) => (
        <section key={sec.step} className={cn(s.tint, "flex flex-col gap-3 px-4 py-4 sm:px-5")}>
          <div className="flex items-center justify-between gap-2">
            <h2
              className={cn(
                s.strong,
                "m-0 flex items-center gap-2.5 text-lg leading-7 font-extrabold",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  s.chipOnBg,
                  "inline-flex size-7 items-center justify-center rounded-[9px] text-[13px] font-extrabold text-white shadow-[0_0_10px_rgb(126_232_199/0.4)]",
                )}
              >
                {i + 1}
              </span>
              {sec.title}
            </h2>
            <button
              type="button"
              className={cn(s.btn, s.soft, "min-h-10 px-4 text-sm [&_svg]:size-4")}
              onClick={() => onEdit(sec.step)}
              aria-label={t(b.editSection, { title: sec.title })}
            >
              <Pencil aria-hidden="true" strokeWidth={1.75} />
              {b.edit}
            </button>
          </div>
          <dl className="m-0 grid grid-cols-[minmax(96px,auto)_1fr] gap-x-4 gap-y-2 text-[15px] leading-6 sm:grid-cols-[minmax(120px,auto)_1fr]">
            {sec.rows.map((row) => (
              <div key={row.k} className="contents">
                <dt className={cn(s.muted, "font-bold")}>{row.k}</dt>
                <dd
                  className={cn(
                    "m-0 min-w-0 break-words",
                    row.missing ? s.missing : cn(s.strong, "font-semibold"),
                  )}
                >
                  {row.v || b.missing}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className={cn(s.tint, "m-0 px-4 py-3 text-sm leading-6")}>{b.reviewNote}</p>
      {submitError ? (
        <div role="alert" className={cn(s.alert, s.pop)}>
          <TriangleAlert aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="grow">{submitError}</span>
        </div>
      ) : null}
    </div>
  );
}
