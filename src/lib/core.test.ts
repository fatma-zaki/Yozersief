import { describe, expect, it, vi } from "vitest";
import { ar, t } from "@/i18n/ar";
import { ForbiddenError, NotFoundError, toAppError, ValidationError } from "./errors";
import { logger, scrub } from "./logger";
import { err, map, ok, unwrap } from "./result";
import { generateOtp, generateToken, hashToken, safeEqual } from "./tokens";

describe("errors", () => {
  it("carries a safe Arabic message and an HTTP status", () => {
    const error = new ForbiddenError("orders.approve");
    expect(error.httpStatus).toBe(403);
    expect(error.userMessage).toBe(ar.errors.forbidden);
    expect(error.permission).toBe("orders.approve");
    expect(new ValidationError({ phone: ["x"] }).fieldErrors).toEqual({ phone: ["x"] });
  });

  it("never exposes unexpected error messages", () => {
    const wrapped = toAppError(new Error('relation "orders" does not exist'));
    expect(wrapped.code).toBe("internal");
    expect(wrapped.userMessage).toBe(ar.errors.generic);
    expect(toAppError(new NotFoundError())).toBeInstanceOf(NotFoundError);
  });
});

describe("result", () => {
  it("maps and unwraps", () => {
    expect(unwrap(map(ok(2), (n) => n * 2))).toBe(4);
    expect(() => unwrap(err(new NotFoundError()))).toThrow(NotFoundError);
  });
});

describe("t", () => {
  it("fills placeholders and keeps unknown ones visible", () => {
    expect(t("مرحبًا {name}، طلبك {ref}", { name: "منى" })).toBe("مرحبًا منى، طلبك {ref}");
  });
});

describe("tokens", () => {
  it("generates url-safe tokens and 6-digit codes", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    for (let i = 0; i < 100; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("hashes deterministically per secret", async () => {
    const secret = "s".repeat(32);
    const a = await hashToken("abc", secret);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken("abc", secret)).toBe(a);
    expect(await hashToken("abc", "t".repeat(32))).not.toBe(a);
    expect(safeEqual(a, a)).toBe(true);
    expect(safeEqual(a, a.replace(/.$/, "x"))).toBe(false);
  });
});

describe("logger", () => {
  it("masks phones and redacts secrets", () => {
    expect(
      scrub({ phone: "01012345678", password: "x", nested: { note: "call 01112345678" } }),
    ).toEqual({
      phone: "010•••••678",
      password: "[redacted]",
      nested: { note: "call 011•••••678" },
    });
  });

  it("writes one JSON line per entry", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.child({ module: "test" }).info("order 01012345678 created", { orderId: "1" });
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({ level: "info", module: "test", orderId: "1" });
    expect(line.msg).toBe("order 010•••••678 created");
    spy.mockRestore();
  });
});
