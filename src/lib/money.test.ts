import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  fromPiasters,
  isMoney,
  multiplyMoney,
  subtractMoney,
  toPiasters,
} from "./money";

describe("money", () => {
  it("round-trips through piasters", () => {
    expect(toPiasters("12.5")).toBe(1250n);
    expect(toPiasters("-0.05")).toBe(-5n);
    expect(fromPiasters(1250n)).toBe("12.50");
    expect(fromPiasters(-5n)).toBe("-0.05");
  });

  it("adds without float drift", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(addMoney("100", "250.75", "0.25")).toBe("351.00");
  });

  it("subtracts, multiplies and compares", () => {
    expect(subtractMoney("1000", "300.50")).toBe("699.50");
    expect(multiplyMoney("45.50", 60)).toBe("2730.00");
    expect(compareMoney("10", "10.00")).toBe(0);
    expect(compareMoney("9.99", "10")).toBe(-1);
  });

  it("rejects invalid input", () => {
    expect(isMoney("1.234")).toBe(false);
    expect(isMoney("abc")).toBe(false);
    expect(() => toPiasters("1.234")).toThrow(RangeError);
    expect(() => multiplyMoney("1", 1.5)).toThrow(RangeError);
  });
});
