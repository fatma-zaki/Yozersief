import { describe, expect, it } from "vitest";
import { generateOrderRef, normalizeOrderRef, ORDER_REF_REGEX } from "./ids";

describe("generateOrderRef", () => {
  it("matches the YZ-XXXXXX format and the DB check constraint", () => {
    for (let i = 0; i < 500; i++) {
      const ref = generateOrderRef();
      expect(ref).toMatch(ORDER_REF_REGEX);
      expect(ref).toMatch(/^YZ-[A-Z0-9]{6}$/);
    }
  });

  it("never uses ambiguous characters", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateOrderRef().slice(3)).not.toMatch(/[IO01]/);
    }
  });
});

describe("normalizeOrderRef", () => {
  it.each([
    ["YZ-AB23CD", "YZ-AB23CD"],
    ["yz-ab23cd", "YZ-AB23CD"],
    [" yz ab23cd ", "YZ-AB23CD"],
    ["AB23CD", "YZ-AB23CD"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeOrderRef(input)).toBe(expected);
  });

  it.each(["YZ-AB23C", "YZ-AB23CDE", "YZ-AB1OCD", "XX-AB23CD"])("rejects %s", (input) => {
    expect(normalizeOrderRef(input)).toBeNull();
  });
});
