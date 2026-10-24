/**
 * Request builder rules (brief B4, B5; design: docs/design/Request.html). Pure: no IO, no framework.
 *
 * `RequestDraft` is everything the customer fills in across the five steps. `buildChecks` turns it
 * into the readiness checklist: one item per required (or optional) thing, with the step and the
 * field it belongs to, so the panel can say what is missing and jump to it. The same function
 * gates "next" on each step and the final submit, so the rules live in one place.
 */
import { WEAR_SIZES } from "@/modules/catalog/schemas";
import { isServiceKey, type CategoryKey } from "@/modules/catalog/schemas";
import { ar, t } from "@/i18n/ar";
import { normalizeDigits } from "@/lib/format";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { MAX_FILE_BYTES } from "./files";
import type { CustomerType } from "./lifecycle";

/** Wear size split S–XXL (brief B4). Defined in catalog seed; re-exported for request-domain consumers. */
export { WEAR_SIZES };
export type WearSize = (typeof WEAR_SIZES)[number];
export const PRINT_PLACES = ["front", "back", "sleeve"] as const;
export type PrintPlace = (typeof PRINT_PLACES)[number];
export const WEAR_PRODUCTS = ["tshirt", "hoodie", "sweat", "cap"] as const;
export const MUG_PRODUCTS = ["mug", "bottle"] as const;
export type ProductKey = (typeof WEAR_PRODUCTS)[number] | (typeof MUG_PRODUCTS)[number];
export const COLORS = ["white", "black", "other"] as const;
export type ColorKey = (typeof COLORS)[number];
export const STICKER_SHAPES = ["circle", "square", "rect", "cut"] as const;
export type StickerShape = (typeof STICKER_SHAPES)[number];
export const BULK_OPTIONS = ["sample", "perPiece", "batches"] as const;
export type BulkOption = (typeof BULK_OPTIONS)[number];

/** A file the customer picked. Local File blobs live in the builder; `uploaded` marks Blob drafts. */
export type DraftFile = {
  id: string;
  name: string;
  size: number;
  status: "done" | "failed";
  error?: string;
  /** Object URL for image previews (browser only). */
  thumb?: string;
  /** True after a successful draft upload + confirm for this submission key. */
  uploaded?: boolean;
};

export type RequestDraft = {
  ctype: CustomerType | "";
  cat: CategoryKey | "";
  /** Catalog product key (wear and mug have product types; see the public catalog). */
  prod: string;
  color: ColorKey | "";
  qty: string;
  sizes: Record<WearSize, string>;
  places: PrintPlace[];
  text: string;
  model: string;
  w: string;
  h: string;
  unit: "cm" | "mm" | "";
  shape: StickerShape | "";
  use: string;
  desc: string;
  notes: string;
  sample: boolean;
  perPiece: boolean;
  batches: boolean;
  batchNotes: string;
  files: DraftFile[];
  help: boolean;
  artNotes: string;
  org: string;
  role: string;
  invoice: boolean;
  taxId: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  receipt: "pickup" | "delivery" | "";
  address: string;
};

export type StepNumber = 1 | 2 | 3 | 4;
export type CheckStatus = "ok" | "attn" | "opt";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  msg: string;
  step: StepNumber;
  /** id of the element "fix it" focuses. */
  field: string;
};

function emptyWearSizes(): Record<WearSize, string> {
  return Object.fromEntries(WEAR_SIZES.map((s) => [s, ""])) as Record<WearSize, string>;
}

export function emptyDraft(): RequestDraft {
  return {
    ctype: "",
    cat: "",
    prod: "",
    color: "",
    qty: "",
    sizes: emptyWearSizes(),
    places: [],
    text: "",
    model: "",
    w: "",
    h: "",
    unit: "",
    shape: "",
    use: "",
    desc: "",
    notes: "",
    sample: false,
    perPiece: false,
    batches: false,
    batchNotes: "",
    files: [],
    help: false,
    artNotes: "",
    org: "",
    role: "",
    invoice: false,
    taxId: "",
    name: "",
    phone: "",
    email: "",
    date: "",
    receipt: "",
    address: "",
  };
}

export const isOrg = (d: Pick<RequestDraft, "ctype">) => d.ctype === "biz" || d.ctype === "group";

/** Digits only (Arabic-Indic accepted) → integer, 0 when empty. */
export function toInt(value: string): number {
  const n = Number.parseInt(normalizeDigits(value).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function toDecimal(value: string): number {
  const n = Number.parseFloat(normalizeDigits(value));
  return Number.isNaN(n) ? 0 : n;
}

export function sizeSum(sizes: RequestDraft["sizes"]): number {
  return WEAR_SIZES.reduce((sum, s) => sum + toInt(sizes[s]), 0);
}

/** Caps have no size split (B4). */
export const hasSizeSplit = (d: Pick<RequestDraft, "cat" | "prod">) =>
  d.cat === "wear" && d.prod !== "cap";

/** Per-piece names exist for wear and mugs only (B5). */
export function bulkOptionsFor(cat: RequestDraft["cat"]): BulkOption[] {
  return BULK_OPTIONS.filter((b) => b !== "perPiece" || cat === "wear" || cat === "mug");
}

const DESIGN_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "ai", "psd", "svg"];
const SHEET_EXTENSIONS = ["xlsx", "xls", "csv"];

export function acceptedExtensions(perPiece: boolean): string[] {
  return perPiece ? [...DESIGN_EXTENSIONS, ...SHEET_EXTENSIONS] : DESIGN_EXTENSIONS;
}

const extensionOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

/** Validates a picked file (A6.5 types, 20 MB). Returns the error to show, or null. */
export function fileError(file: { name: string; size: number }, perPiece: boolean): string | null {
  const b = ar.order.builder;
  if (!acceptedExtensions(perPiece).includes(extensionOf(file.name))) {
    return t(b.badType, { types: perPiece ? b.badTypeListSheet : b.badTypeList });
  }
  if (file.size > MAX_FILE_BYTES) return b.tooBig;
  return null;
}

/** A names sheet: spreadsheet, CSV or PDF (B5). */
export const isNamesSheet = (f: DraftFile) =>
  f.status === "done" && /\.(xlsx|xls|csv|pdf)$/i.test(f.name);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A product's display name: the catalog's name when given, else the built-in B4 label. */
export function productLabel(key: string, names: Readonly<Record<string, string>> = {}): string {
  return names[key] ?? (ar.order.builder.products as Readonly<Record<string, string>>)[key] ?? key;
}

/** The checklist's name for a category: the B4 short label, or a dashboard service's name. */
export function categoryLabel(
  cat: CategoryKey,
  names: Readonly<Record<string, string>> = {},
): string {
  return isServiceKey(cat) ? (names[cat] ?? cat) : ar.order.builder.cats[cat].short;
}

/**
 * `names`: catalog product and service names by key, so the checklist shows what the customer
 * picked.
 */
export function buildChecks(
  d: RequestDraft,
  today: string,
  names: Readonly<Record<string, string>> = {},
): Check[] {
  const c = ar.order.checks;
  const L = ar.order.builder;
  const checks: Check[] = [];
  const add = (
    id: string,
    label: string,
    status: CheckStatus,
    msg: string,
    step: StepNumber,
    field: string,
  ) => checks.push({ id, label, status, msg, step, field });
  const org = isOrg(d);

  // Step 1
  add(
    "ctype",
    c.ctype,
    d.ctype ? "ok" : "attn",
    d.ctype ? L.ctypes[d.ctype].t : c.ctypeAttn,
    1,
    "f-ctype",
  );
  add(
    "cat",
    c.cat,
    d.cat ? "ok" : "attn",
    d.cat ? categoryLabel(d.cat, names) : c.catAttn,
    1,
    "f-cat",
  );

  // Step 2
  const qty = toInt(d.qty);
  const qtyCheck = () =>
    add(
      "qty",
      c.qty,
      qty > 0 ? "ok" : "attn",
      qty > 0 ? t(c.qtyOk, { n: qty }) : c.qtyAttn,
      2,
      "f-qty",
    );

  if (d.cat === "wear") {
    add(
      "prod",
      c.prod,
      d.prod ? "ok" : "attn",
      d.prod ? productLabel(d.prod, names) : c.prodAttnWear,
      2,
      "f-prod",
    );
    add(
      "color",
      c.color,
      d.color ? "ok" : "attn",
      d.color ? L.colors[d.color] : c.colorAttn,
      2,
      "f-color",
    );
    qtyCheck();
    if (hasSizeSplit(d)) {
      const sum = sizeSum(d.sizes);
      const ok = qty > 0 && sum === qty;
      const msg =
        qty === 0
          ? c.sizesNoQty
          : ok
            ? c.sizesOk
            : sum < qty
              ? t(c.sizesLess, { sum, qty, diff: qty - sum })
              : t(c.sizesMore, { sum, diff: sum - qty });
      add("sizes", c.sizes, ok ? "ok" : "attn", msg, 2, "f-size-S");
    }
    add(
      "place",
      c.place,
      d.places.length ? "ok" : "attn",
      d.places.length ? d.places.map((p) => L.placeLabels[p]).join("، ") : c.placeAttn,
      2,
      "f-place",
    );
  } else if (d.cat === "mug") {
    add(
      "prod",
      c.prod,
      d.prod ? "ok" : "attn",
      d.prod ? productLabel(d.prod, names) : c.prodAttnMug,
      2,
      "f-prod",
    );
    qtyCheck();
    add(
      "text",
      c.text,
      d.text.trim() ? "ok" : "opt",
      d.text.trim() ? `«${d.text.trim()}»` : c.optional,
      2,
      "f-text",
    );
  } else if (d.cat === "phone") {
    add(
      "model",
      c.model,
      d.model.trim() ? "ok" : "attn",
      d.model.trim() || c.modelAttn,
      2,
      "f-model",
    );
    qtyCheck();
  } else if (d.cat === "sticker") {
    const w = toDecimal(d.w);
    const h = toDecimal(d.h);
    const ok = w > 0 && h > 0 && Boolean(d.unit);
    const msg = ok
      ? `${w} × ${h} ${L.units[d.unit as "cm" | "mm"]}`
      : !(w > 0 && h > 0)
        ? c.dimsAttn
        : c.unitAttn;
    add("dims", c.dims, ok ? "ok" : "attn", msg, 2, !(w > 0) ? "f-w" : !(h > 0) ? "f-h" : "f-unit");
    add("shape", c.shape, d.shape ? "ok" : "attn", d.shape ? c.shapeOk : c.shapeAttn, 2, "f-shape");
    qtyCheck();
  } else if (d.cat === "custom") {
    const ok = d.desc.trim().length >= 10;
    add("desc", c.desc, ok ? "ok" : "attn", ok ? c.done : c.descAttn, 2, "f-desc");
  } else if (d.cat && isServiceKey(d.cat)) {
    qtyCheck();
    const ok = d.desc.trim().length >= 10;
    add("desc", c.serviceDesc, ok ? "ok" : "attn", ok ? c.done : c.serviceDescAttn, 2, "f-desc");
  }
  if (org && d.batches) {
    const ok = d.batchNotes.trim().length >= 5;
    add("batch", c.batch, ok ? "ok" : "attn", ok ? c.done : c.batchAttn, 2, "f-batch");
  }

  // Step 3
  const done = d.files.filter((f) => f.status === "done").length;
  const failed = d.files.some((f) => f.status === "failed");
  let artStatus: CheckStatus = "attn";
  let artMsg: string = c.artAttn;
  if (failed) artMsg = c.artFailed;
  else if (done || d.help) {
    artStatus = "ok";
    artMsg = done ? t(c.artFiles, { n: done }) + (d.help ? c.artPlusHelp : "") : c.artHelp;
  }
  add("art", c.art, artStatus, artMsg, 3, "f-files");
  if (org && d.perPiece && bulkOptionsFor(d.cat).includes("perPiece")) {
    const sheet = d.files.some(isNamesSheet);
    add("sheet", c.sheet, sheet ? "ok" : "attn", sheet ? c.sheetOk : c.sheetAttn, 3, "f-files");
  }

  // Step 4
  if (org) {
    const ok = d.org.trim().length >= 2;
    add(
      "org",
      d.ctype === "biz" ? c.orgBiz : c.orgGroup,
      ok ? "ok" : "attn",
      ok ? d.org.trim() : c.orgAttn,
      4,
      "f-org",
    );
  }
  const nameOk = d.name.trim().length >= 2;
  add(
    "name",
    org ? c.contact : c.name,
    nameOk ? "ok" : "attn",
    nameOk ? d.name.trim() : c.nameAttn,
    4,
    "f-name",
  );
  const phone = normalizeEgyptianMobile(d.phone);
  add(
    "phone",
    c.phone,
    phone ? "ok" : "attn",
    phone ?? (d.phone.trim() ? c.phoneBad : c.phoneAttn),
    4,
    "f-phone",
  );
  if (d.email.trim()) {
    const ok = EMAIL_REGEX.test(d.email.trim());
    add("email", c.email, ok ? "ok" : "attn", ok ? d.email.trim() : c.emailAttn, 4, "f-email");
  }
  add(
    "receipt",
    c.receipt,
    d.receipt ? "ok" : "attn",
    d.receipt ? L.receipts[d.receipt].t : c.receiptAttn,
    4,
    "f-receipt",
  );
  // B5: delivery needs an address.
  if (d.receipt === "delivery") {
    const ok = d.address.trim().length >= 5;
    add(
      "address",
      c.address,
      ok ? "ok" : "attn",
      ok ? d.address.trim() : c.addressAttn,
      4,
      "f-address",
    );
  }
  const past = Boolean(d.date) && d.date < today;
  add(
    "date",
    c.date,
    d.date ? (past ? "attn" : "ok") : "opt",
    d.date ? (past ? c.datePast : t(c.dateOk, { date: d.date })) : c.optional,
    4,
    "f-date",
  );
  return checks;
}

export type Readiness = {
  done: number;
  total: number;
  attention: Check[];
  ready: boolean;
};

/** Counts for the readiness ring: required items only (optional ones don't count). */
export function readiness(checks: readonly Check[]): Readiness {
  const required = checks.filter((c) => c.status !== "opt");
  const attention = checks.filter((c) => c.status === "attn");
  return {
    done: required.filter((c) => c.status === "ok").length,
    total: required.length,
    attention,
    ready: attention.length === 0,
  };
}

/**
 * Applies a change with the side effects the design expects: switching to "person" clears the
 * organisation-only options; switching category clears the product.
 */
export function updateDraft(d: RequestDraft, patch: Partial<RequestDraft>): RequestDraft {
  const next = { ...d, ...patch };
  if (patch.ctype === "person") {
    next.sample = false;
    next.perPiece = false;
    next.batches = false;
    next.invoice = false;
  }
  if (patch.cat !== undefined && patch.cat !== d.cat) next.prod = "";
  return next;
}
