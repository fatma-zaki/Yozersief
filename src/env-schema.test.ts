import { afterEach, describe, expect, it } from "vitest";
import { assertProductionRateLimitConfig } from "./env-schema";

const base = {
  RATE_LIMIT_DISABLED: false as boolean,
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
};

describe("assertProductionRateLimitConfig", () => {
  afterEach(() => {
    // no process.env mutation in these unit cases
  });

  it("is a no-op outside Vercel production", () => {
    expect(() =>
      assertProductionRateLimitConfig(
        { ...base, RATE_LIMIT_DISABLED: true, UPSTASH_REDIS_REST_URL: undefined },
        undefined,
      ),
    ).not.toThrow();
    expect(() =>
      assertProductionRateLimitConfig({ ...base, RATE_LIMIT_DISABLED: true }, "preview"),
    ).not.toThrow();
  });

  it("rejects RATE_LIMIT_DISABLED in production", () => {
    expect(() =>
      assertProductionRateLimitConfig({ ...base, RATE_LIMIT_DISABLED: true }, "production"),
    ).toThrow(/RATE_LIMIT_DISABLED/);
  });

  it("requires Redis URL in production", () => {
    expect(() =>
      assertProductionRateLimitConfig({ ...base, UPSTASH_REDIS_REST_URL: undefined }, "production"),
    ).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it("requires Redis TOKEN in production", () => {
    expect(() =>
      assertProductionRateLimitConfig(
        { ...base, UPSTASH_REDIS_REST_TOKEN: undefined },
        "production",
      ),
    ).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  it("accepts a fully configured production rate-limit env", () => {
    expect(() => assertProductionRateLimitConfig(base, "production")).not.toThrow();
  });
});
