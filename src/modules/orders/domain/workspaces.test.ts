import { describe, expect, it } from "vitest";
import { deskMockupState } from "./desk";
import {
  acceptsPayment,
  canUploadMockup,
  clampCount,
  designState,
  isDesignJob,
  paymentKindFor,
  productionColumn,
} from "./workspaces";

const biz = (status: string, bizStage: string | null) =>
  ({ status, bizStage, customerType: "biz" }) as Parameters<typeof isDesignJob>[0];
const person = (status: string) =>
  ({ status, bizStage: null, customerType: "person" }) as Parameters<typeof isDesignJob>[0];

describe("design workspace", () => {
  it("takes business orders at the mockup stage only", () => {
    expect(isDesignJob(biz("approved", "mockup"))).toBe(true);
    expect(isDesignJob(biz("approved", "deposit"))).toBe(false);
    expect(isDesignJob(person("approved"))).toBe(false);
  });

  it("follows the latest mockup version", () => {
    expect(designState(null)).toBe("need");
    expect(designState("with_desk")).toBe("sent");
    expect(designState("sent")).toBe("waiting");
    expect(designState("changes_requested")).toBe("change");
    expect(canUploadMockup("need") && canUploadMockup("change")).toBe(true);
    expect(canUploadMockup("sent") || canUploadMockup("waiting")).toBe(false);
  });

  it("hands the desk the mockup while it waits on them or the customer", () => {
    expect(deskMockupState("with_desk")).toBe("mockup");
    expect(deskMockupState("sent")).toBe("mockup_sent");
    expect(deskMockupState("approved")).toBeNull();
    expect(deskMockupState(null)).toBeNull();
  });
});

describe("production board", () => {
  it("starts business orders only after mockup and deposit (production stage)", () => {
    expect(productionColumn(biz("approved", "deposit"), null)).toBeNull();
    expect(productionColumn(biz("approved", "production"), null)).toBe("queue");
    expect(productionColumn(person("approved"), null)).toBe("queue");
  });

  it("places running orders by job stage and business stage", () => {
    expect(productionColumn(biz("in_production", "production"), "printing")).toBe("print");
    expect(productionColumn(biz("in_production", "qc"), "qc")).toBe("qc");
    expect(productionColumn(person("in_production"), "qc")).toBe("qc");
    expect(productionColumn(person("in_production"), null)).toBe("print");
    expect(productionColumn(person("ready"), "ready")).toBe("ready");
    expect(productionColumn(person("delivered"), "ready")).toBeNull();
  });

  it("clamps the press counter", () => {
    expect(clampCount(-3, 10)).toBe(0);
    expect(clampCount(14, 10)).toBe(10);
    expect(clampCount(4, 10)).toBe(4);
  });
});

describe("payments", () => {
  it("is a deposit before production on business orders", () => {
    expect(paymentKindFor(biz("approved", "deposit"), false)).toBe("deposit");
    expect(paymentKindFor(biz("approved", "mockup"), true)).toBe("deposit");
    expect(paymentKindFor(biz("ready", "delivery"), true)).toBe("balance");
    expect(paymentKindFor(person("ready"), false)).toBe("full");
  });

  it("is recorded on decided, open orders only", () => {
    expect(acceptsPayment(person("approved"))).toBe(true);
    expect(acceptsPayment(person("ready"))).toBe(true);
    expect(acceptsPayment(person("submitted"))).toBe(false);
    expect(acceptsPayment(person("delivered"))).toBe(false);
  });
});
