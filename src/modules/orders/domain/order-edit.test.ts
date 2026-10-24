import { describe, expect, it } from "vitest";
import { planOrderEdit, toEditForm, type EditableOrder } from "./order-edit";

const order = (patch: Partial<EditableOrder> = {}): EditableOrder => ({
  quantity: 12,
  color: "white",
  phoneModel: null,
  width: null,
  height: null,
  unit: null,
  shape: null,
  customText: null,
  description: null,
  notes: "لوجو صغير",
  designNotes: null,
  receiptMethod: "pickup",
  deliveryAddress: null,
  desiredDate: null,
  sizes: [
    { size: "M", qty: 7 },
    { size: "L", qty: 5 },
  ],
  places: ["front"],
  ...patch,
});

describe("order edit", () => {
  it("round-trips an unchanged order with no changes", () => {
    const o = order({ width: "12.50", height: "8", unit: "cm" });
    const plan = planOrderEdit(o, { ...toEditForm(o), w: "12.5" });
    expect(plan).toEqual({ patch: {}, sizes: null, places: null, changed: [] });
  });

  it("sets the quantity from a changed size split", () => {
    const o = order();
    const form = toEditForm(o);
    const plan = planOrderEdit(o, { ...form, sizes: { ...form.sizes, M: "10" } });
    expect(plan.patch).toEqual({ quantity: 15 });
    expect(plan.sizes).toEqual([
      { size: "M", qty: 10 },
      { size: "L", qty: 5 },
    ]);
    expect(plan.changed).toEqual(["الكمية", "المقاسات"]);
  });

  it("clears the address when switching to pickup and records each field", () => {
    const o = order({ receiptMethod: "delivery", deliveryAddress: "مدينة نصر" });
    const plan = planOrderEdit(o, {
      ...toEditForm(o),
      receipt: "pickup",
      notes: "",
      places: ["front", "back"],
    });
    expect(plan.patch).toEqual({ notes: null, receiptMethod: "pickup", deliveryAddress: null });
    expect(plan.places).toEqual(["front", "back"]);
    expect(plan.changed).toEqual([
      "ملاحظات العميل",
      "طريقة الاستلام",
      "عنوان التوصيل",
      "أماكن الطباعة",
    ]);
  });
});
