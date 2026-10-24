import { describe, expect, it } from "vitest";
import type { Permission } from "@/lib/rbac/permissions";
import { defaultPermissionsFor } from "@/lib/rbac";
import {
  adminStatus,
  canDecide,
  decisionStep,
  desiredLabel,
  nextStage,
  productLabel,
  specList,
  stageIndex,
  whenLabel,
  type OrderFacts,
} from "./admin-view";
import type { Actor, OrderState } from "./lifecycle";

const staff = (role: "admin" | "desk" | "prod"): Actor => {
  const perms = new Set<Permission>(defaultPermissionsFor(role));
  return { kind: "staff", id: role, can: (p) => role === "admin" || perms.has(p) };
};

const facts = (patch: Partial<OrderFacts>): OrderFacts => ({
  categoryKey: "wear",
  categoryName: "تيشيرتات وهوديز وكابات",
  productKey: "tshirt",
  productName: "تيشيرت",
  quantity: 12,
  color: "white",
  phoneModel: null,
  width: null,
  height: null,
  unit: null,
  shape: null,
  customText: null,
  description: null,
  notes: null,
  designNotes: null,
  needsDesignHelp: false,
  receiptMethod: "pickup",
  deliveryAddress: null,
  desiredDate: null,
  sizes: [],
  places: [],
  ...patch,
});

const person = (status: OrderState["status"]): OrderState => ({
  status,
  bizStage: null,
  customerType: "person",
});

describe("admin view labels", () => {
  it("maps lifecycle statuses to the design's five", () => {
    expect(adminStatus("submitted")).toBe("new");
    expect(adminStatus("awaiting_customer")).toBe("awaiting");
    expect(adminStatus("in_production")).toBe("approved");
    expect(adminStatus("cancelled")).toBe("rejected");
  });

  it("builds the list product label per category", () => {
    expect(productLabel(facts({}))).toBe("تيشيرت أبيض × 12");
    expect(
      productLabel(facts({ categoryKey: "phone", phoneModel: "iPhone 13", quantity: 1 })),
    ).toBe("كفر iPhone 13 × 1");
    expect(productLabel(facts({ categoryKey: "sticker", shape: "circle", quantity: 200 }))).toBe(
      "استيكر دائري × 200",
    );
  });

  it("lists wear specs with sizes in S–XXL order and print places", () => {
    const specs = specList(
      facts({
        sizes: [
          { size: "XL", qty: 2 },
          { size: "S", qty: 2 },
          { size: "M", qty: 4 },
        ],
        places: ["front", "back"],
      }),
    );
    expect(specs).toEqual([
      { k: "النوع", v: "تيشيرت" },
      { k: "اللون", v: "أبيض" },
      { k: "المقاسات", v: "S2 · M4 · XL2" },
      { k: "الطباعة", v: "أمام + ظهر" },
    ]);
  });

  it("formats the desired date and list times in Cairo time", () => {
    expect(desiredLabel(null)).toBe("مش محدد");
    expect(desiredLabel("2026-11-02")).toBe("مرغوب: 2 نوفمبر");
    const now = new Date("2026-10-22T12:00:00Z");
    expect(whenLabel(new Date("2026-10-22T07:12:00Z"), now)).toBe("النهارده 10:12 ص");
    expect(whenLabel(new Date("2026-10-21T13:30:00Z"), now)).toBe("أمس 4:30 م");
    expect(whenLabel(new Date("2026-10-18T10:00:00Z"), now)).toBe("18 أكتوبر");
  });

  it("puts done after the seven rail stages", () => {
    expect(stageIndex("quote")).toBe(0);
    expect(stageIndex("delivery")).toBe(6);
    expect(stageIndex("done")).toBe(7);
  });
});

describe("decisions", () => {
  it("moves a new order into review before approving", () => {
    expect(decisionStep(person("submitted"), "approve")).toEqual({
      step: "start_review",
      final: false,
    });
    expect(decisionStep(person("in_review"), "approve")).toEqual({ step: "approve", final: true });
    expect(
      decisionStep({ status: "in_review", bizStage: "quote", customerType: "biz" }, "approve"),
    ).toEqual({ step: "approve_and_send_quote", final: true });
  });

  it("resumes a paused order before approving or asking again, but rejects directly", () => {
    expect(decisionStep(person("awaiting_customer"), "approve").step).toBe("customer_responded");
    expect(decisionStep(person("awaiting_customer"), "info").step).toBe("customer_responded");
    expect(decisionStep(person("awaiting_customer"), "reject")).toEqual({
      step: "reject",
      final: true,
    });
  });

  it("follows the role matrix: desk asks for info, only the admin approves or rejects", () => {
    expect(canDecide(person("submitted"), "approve", staff("admin"))).toBe(true);
    expect(canDecide(person("submitted"), "approve", staff("desk"))).toBe(false);
    expect(canDecide(person("submitted"), "info", staff("desk"))).toBe(true);
    expect(canDecide(person("submitted"), "reject", staff("desk"))).toBe(false);
    expect(canDecide(person("in_review"), "info", staff("prod"))).toBe(false);
  });

  it("offers no decision once the order is decided", () => {
    expect(canDecide(person("rejected"), "approve", staff("admin"))).toBe(false);
    expect(canDecide(person("in_production"), "reject", staff("admin"))).toBe(false);
  });
});

describe("next business stage", () => {
  const bulk = { sample: true, batches: false };
  it("records the stage the pipeline is at", () => {
    const at = (status: OrderState["status"], bizStage: OrderState["bizStage"]) =>
      nextStage({ status, bizStage, customerType: "biz" }, bulk);
    expect(at("approved", "customer_approval")?.transition).toBe("accept_quote");
    expect(at("approved", "mockup")?.label).toBe("العميل اعتمد الموكاب والعينة");
    expect(at("approved", "production")?.transition).toBe("start_production");
    expect(at("in_production", "production")?.transition).toBe("send_to_qc");
    expect(at("ready", "delivery")?.transition).toBe("deliver");
    expect(at("in_review", "quote")).toBeNull();
  });

  it("has no pipeline for individuals", () => {
    expect(nextStage(person("approved"), bulk)).toBeNull();
  });
});
