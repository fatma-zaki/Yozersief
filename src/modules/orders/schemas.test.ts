import { describe, expect, it } from "vitest";
import { submitOrderInputSchema } from "./schemas";

const base = {
  submissionKey: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  ctype: "person" as const,
  cat: "custom" as const,
  desc: "عايز أطباعة فكرة خاصة للمدرسة",
  help: true,
  hasDesignFiles: false,
  hasNamesSheet: false,
  name: "أحمد علي",
  phone: "01012345678",
  receipt: "pickup" as const,
};

describe("submitOrderInputSchema", () => {
  it("accepts a minimal custom person request with design help", () => {
    const parsed = submitOrderInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid Egyptian phone", () => {
    const parsed = submitOrderInputSchema.safeParse({ ...base, phone: "01234" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === "phone")).toBe(true);
    }
  });

  it("rejects custom description shorter than 10 chars", () => {
    const parsed = submitOrderInputSchema.safeParse({ ...base, desc: "قصير" });
    expect(parsed.success).toBe(false);
  });

  it("requires design files or help", () => {
    const parsed = submitOrderInputSchema.safeParse({
      ...base,
      help: false,
      hasDesignFiles: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("requires a names sheet when perPiece is on for orgs", () => {
    const parsed = submitOrderInputSchema.safeParse({
      ...base,
      ctype: "biz",
      cat: "mug",
      prod: "mug",
      qty: "10",
      org: "شركة النور",
      perPiece: true,
      hasNamesSheet: false,
      hasDesignFiles: true,
      help: false,
      desc: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires delivery address for delivery receipt", () => {
    const parsed = submitOrderInputSchema.safeParse({
      ...base,
      receipt: "delivery",
      address: "قريب",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a wear order with matching size split", () => {
    const parsed = submitOrderInputSchema.safeParse({
      ...base,
      cat: "wear",
      prod: "tshirt",
      color: "black",
      qty: "3",
      sizes: { S: "1", M: "2", L: "", XL: "", XXL: "" },
      places: ["front"],
      desc: "",
      help: false,
      hasDesignFiles: true,
    });
    expect(parsed.success).toBe(true);
  });
});
