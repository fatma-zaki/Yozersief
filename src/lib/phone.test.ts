import { describe, expect, it } from "vitest";
import { lastDigits, maskPhone, normalizeEgyptianMobile, toInternational } from "./phone";

describe("normalizeEgyptianMobile", () => {
  it.each([
    ["01012345678", "01012345678"],
    ["011 2345 6789", "01123456789"],
    ["012-345-67890", "01234567890"],
    ["+201512345678", "01512345678"],
    ["00201012345678", "01012345678"],
    ["201012345678", "01012345678"],
    ["1012345678", "01012345678"],
    ["٠١٠١٢٣٤٥٦٧٨", "01012345678"],
    ["۰۱۱۱۲۳۴۵۶۷۸", "01112345678"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeEgyptianMobile(input)).toBe(expected);
  });

  it.each(["01312345678", "0101234567", "010123456789", "02012345678", "abc", ""])(
    "rejects %s",
    (input) => {
      expect(normalizeEgyptianMobile(input)).toBeNull();
    },
  );
});

describe("maskPhone", () => {
  it("keeps the first and last three digits", () => {
    expect(maskPhone("01012345678")).toBe("010•••••678");
  });

  it("fully masks short values", () => {
    expect(maskPhone("12345")).toBe("•••••");
  });
});

describe("toInternational / lastDigits", () => {
  it("converts to the wa.me format", () => {
    expect(toInternational("01116891025")).toBe("201116891025");
  });

  it("returns the handover verification digits", () => {
    expect(lastDigits("01116891025")).toBe("025");
  });
});
