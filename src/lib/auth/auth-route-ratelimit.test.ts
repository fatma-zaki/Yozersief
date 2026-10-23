import { beforeEach, describe, expect, it, vi } from "vitest";
import { limitForAuthApiPath, normalizeAuthApiPath } from "./auth-route-ratelimit-policy";

describe("normalizeAuthApiPath", () => {
  it("strips /api/auth and query strings", () => {
    expect(normalizeAuthApiPath("/api/auth/sign-in/email")).toBe("/sign-in/email");
    expect(normalizeAuthApiPath("/api/auth/sign-in/email?x=1")).toBe("/sign-in/email");
    expect(normalizeAuthApiPath("/sign-in/email")).toBe("/sign-in/email");
  });
});

describe("limitForAuthApiPath", () => {
  it("applies auth.login to credential and challenge endpoints", () => {
    expect(limitForAuthApiPath("/api/auth/sign-in/email")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/sign-in/phone-number")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/two-factor/verify-totp")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/two-factor/verify-backup-code")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/request-password-reset")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/reset-password")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/reset-password/abc")).toBe("auth.login");
    expect(limitForAuthApiPath("/api/auth/phone-number/send-otp")).toBe("auth.login");
  });

  it("does not blanket-limit session or setup paths", () => {
    expect(limitForAuthApiPath("/api/auth/get-session")).toBeNull();
    expect(limitForAuthApiPath("/api/auth/ok")).toBeNull();
    expect(limitForAuthApiPath("/api/auth/sign-out")).toBeNull();
    expect(limitForAuthApiPath("/api/auth/two-factor/enable")).toBeNull();
    expect(limitForAuthApiPath("/api/auth/two-factor/get-totp-uri")).toBeNull();
  });
});

describe("enforceAuthApiRateLimit", () => {
  const enforceRateLimit = vi.fn(async () => undefined);

  beforeEach(() => {
    enforceRateLimit.mockReset();
    vi.resetModules();
    vi.doMock("@/lib/ratelimit", () => ({
      clientIp: () => "9.9.9.9",
      enforceRateLimit,
    }));
  });

  it("enforces auth.login for sensitive paths and skips exempt ones", async () => {
    const { enforceAuthApiRateLimit } = await import("./auth-route-ratelimit");

    await enforceAuthApiRateLimit(
      new Request("http://localhost/api/auth/sign-in/email", { method: "POST" }),
    );
    expect(enforceRateLimit).toHaveBeenCalledWith("auth.login", "9.9.9.9:route:/sign-in/email");

    enforceRateLimit.mockClear();
    await enforceAuthApiRateLimit(
      new Request("http://localhost/api/auth/get-session", { method: "GET" }),
    );
    expect(enforceRateLimit).not.toHaveBeenCalled();
  });
});
