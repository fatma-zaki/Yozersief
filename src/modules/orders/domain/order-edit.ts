/**
 * «تعديل الطلب» (admin): the order's details as form strings, and which columns a corrected form
 * changes. Pure: no IO, no framework. The use case writes the patch and logs `changed`.
 */
import { WEAR_SIZES } from "@/modules/catalog/schemas";
import type { WearSize } from "./request";

/** The editable details of an order, as stored. */
export type EditableOrder = {
  quantity: number | null;
  color: string | null;
  phoneModel: string | null;
  width: string | null;
  height: string | null;
  unit: string | null;
  shape: string | null;
  customText: string | null;
  description: string | null;
  notes: string | null;
  designNotes: string | null;
  receiptMethod: "pickup" | "delivery";
  deliveryAddress: string | null;
  desiredDate: string | null;
  sizes: { size: string; qty: number }[];
  places: string[];
};

/** The same details as the form holds them (validated by `editOrderSchema`). */
export type OrderEditForm = {
  qty: string;
  sizes: Record<WearSize, string>;
  places: string[];
  color: string;
  model: string;
  w: string;
  h: string;
  unit: string;
  shape: string;
  text: string;
  desc: string;
  notes: string;
  artNotes: string;
  receipt: "pickup" | "delivery";
  address: string;
  date: string;
};

type Columns = Omit<EditableOrder, "sizes" | "places">;

export type OrderEditPlan = {
  /** Order columns to update (only those that changed). */
  patch: Partial<Columns>;
  /** The new size split, when it changed. */
  sizes: { size: string; qty: number }[] | null;
  /** The new print places, when they changed. */
  places: string[] | null;
  /** Arabic names of what changed, for the timeline and the toast. */
  changed: string[];
};

const FIELD_LABELS: Record<keyof Columns | "sizes" | "places", string> = {
  quantity: "الكمية",
  color: "اللون",
  phoneModel: "طراز الهاتف",
  width: "العرض",
  height: "الطول",
  unit: "وحدة القياس",
  shape: "الشكل",
  customText: "النص",
  description: "الوصف",
  notes: "ملاحظات العميل",
  designNotes: "ملاحظات التصميم",
  receiptMethod: "طريقة الاستلام",
  deliveryAddress: "عنوان التوصيل",
  desiredDate: "التاريخ المرغوب",
  sizes: "المقاسات",
  places: "أماكن الطباعة",
};

const str = (v: string | number | null) => (v === null ? "" : String(v));
const orNull = (v: string) => (v === "" ? null : v);
/** "12.50" and "12.5" are the same width: compare numerics by value. */
const sameNumber = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && Number(a) === Number(b));

export function toEditForm(o: EditableOrder): OrderEditForm {
  const sizes = Object.fromEntries(WEAR_SIZES.map((s) => [s, ""])) as Record<WearSize, string>;
  for (const s of o.sizes) if (s.size in sizes) sizes[s.size as WearSize] = String(s.qty);
  return {
    qty: str(o.quantity),
    sizes,
    places: [...o.places],
    color: str(o.color),
    model: str(o.phoneModel),
    w: str(o.width),
    h: str(o.height),
    unit: str(o.unit),
    shape: str(o.shape),
    text: str(o.customText),
    desc: str(o.description),
    notes: str(o.notes),
    artNotes: str(o.designNotes),
    receipt: o.receiptMethod,
    address: str(o.deliveryAddress),
    date: str(o.desiredDate),
  };
}

/**
 * What saving `form` over `current` changes. A size split, when given, sets the quantity to its
 * sum (as on submit); clearing every size removes the split and keeps the typed quantity.
 */
export function planOrderEdit(current: EditableOrder, form: OrderEditForm): OrderEditPlan {
  const split = WEAR_SIZES.flatMap((size) => {
    const qty = Number(form.sizes[size] || 0);
    return qty > 0 ? [{ size, qty }] : [];
  });
  const sum = split.reduce((n, s) => n + s.qty, 0);
  const next: Columns = {
    quantity: sum || (form.qty ? Number(form.qty) : null),
    color: orNull(form.color),
    phoneModel: orNull(form.model),
    width: orNull(form.w),
    height: orNull(form.h),
    unit: orNull(form.unit),
    shape: orNull(form.shape),
    customText: orNull(form.text),
    description: orNull(form.desc),
    notes: orNull(form.notes),
    designNotes: orNull(form.artNotes),
    receiptMethod: form.receipt,
    deliveryAddress: form.receipt === "delivery" ? orNull(form.address) : null,
    desiredDate: orNull(form.date),
  };

  const patch: Partial<Columns> = {};
  const changed: string[] = [];
  for (const key of Object.keys(next) as (keyof Columns)[]) {
    const before = current[key];
    const after = next[key];
    const same =
      key === "width" || key === "height"
        ? sameNumber(before as string | null, after as string | null)
        : before === after;
    if (same) continue;
    (patch as Record<string, unknown>)[key] = after;
    changed.push(FIELD_LABELS[key]);
  }

  const key = (list: { size: string; qty: number }[]) =>
    list
      .map((s) => `${s.size}:${s.qty}`)
      .sort()
      .join(",");
  const sizesChanged = key(current.sizes) !== key(split);
  if (sizesChanged) changed.push(FIELD_LABELS.sizes);

  const places = [...new Set(form.places)];
  const placesChanged = [...current.places].sort().join(",") !== [...places].sort().join(",");
  if (placesChanged) changed.push(FIELD_LABELS.places);

  return {
    patch,
    sizes: sizesChanged ? split : null,
    places: placesChanged ? places : null,
    changed,
  };
}
