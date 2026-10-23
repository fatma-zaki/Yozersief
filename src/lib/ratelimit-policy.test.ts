import { describe, expect, it } from "vitest";
import {
  allowFromRedisResult,
  allowWhenRedisUnavailable,
  isAuthSensitiveLimit,
} from "./ratelimit-policy";

describe("rate-limit failure policy", () => {
  it("classifies auth-sensitive vs public limits", () => {
    expect(isAuthSensitiveLimit("auth.login")).toBe(true);
    expect(isAuthSensitiveLimit("access.request")).toBe(true);
    expect(isAuthSensitiveLimit("otp.send")).toBe(true);
    expect(isAuthSensitiveLimit("otp.verify")).toBe(true);
    expect(isAuthSensitiveLimit("upload.token")).toBe(false);
    expect(isAuthSensitiveLimit("tracking.lookup")).toBe(false);
    expect(isAuthSensitiveLimit("order.submit")).toBe(false);
  });

  it("fails closed for auth-sensitive Redis unavailability", () => {
    expect(allowWhenRedisUnavailable("auth.login")).toBe(false);
    expect(allowWhenRedisUnavailable("access.request")).toBe(false);
  });

  it("fails open for public Redis unavailability", () => {
    expect(allowWhenRedisUnavailable("upload.token")).toBe(true);
    expect(allowWhenRedisUnavailable("order.submit")).toBe(true);
  });

  it("treats Upstash timeout reason as unavailable (not a silent allow for auth)", () => {
    expect(allowFromRedisResult("auth.login", { success: true, reason: "timeout" })).toBe(false);
    expect(allowFromRedisResult("upload.token", { success: true, reason: "timeout" })).toBe(true);
  });

  it("honours normal success / deny results", () => {
    expect(allowFromRedisResult("auth.login", { success: true })).toBe(true);
    expect(allowFromRedisResult("auth.login", { success: false })).toBe(false);
    expect(allowFromRedisResult("upload.token", { success: false })).toBe(false);
  });
});
