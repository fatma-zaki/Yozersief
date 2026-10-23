import { describe, expect, it } from "vitest";
import { trackingLookupSchema } from "./schemas";

describe("trackingLookupSchema", () => {
  it("accepts a valid ref + Egyptian mobile (normalised)", () => {
    const parsed = trackingLookupSchema.safeParse({
      ref: " yz-ab23cd ",
      phone: "+20 101 234 5678",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ ref: "YZ-AB23CD", phone: "01012345678" });
  });

  it("rejects a malformed ref", () => {
    const parsed = trackingLookupSchema.safeParse({ ref: "NOPE", phone: "01012345678" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed phone", () => {
    const parsed = trackingLookupSchema.safeParse({ ref: "YZ-AB23CD", phone: "123" });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty fields", () => {
    expect(trackingLookupSchema.safeParse({ ref: "", phone: "01012345678" }).success).toBe(false);
    expect(trackingLookupSchema.safeParse({ ref: "YZ-AB23CD", phone: "" }).success).toBe(false);
  });
});
