import { beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
const loggerError = vi.fn();

vi.mock("@/env", () => ({
  env: {
    RATE_LIMIT_DISABLED: false,
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function Redis() {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    vi.fn(function Ratelimit() {
      return { limit };
    }),
    {
      slidingWindow: vi.fn(() => ({})),
    },
  ),
}));

vi.mock("./logger", () => ({
  logger: { error: loggerError, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("checkRateLimit with Redis backend", () => {
  beforeEach(() => {
    limit.mockReset();
    loggerError.mockReset();
    vi.resetModules();
  });

  it("allows a successful Redis check", async () => {
    limit.mockResolvedValue({ success: true });
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("auth.login", "ip:user")).resolves.toBe(true);
  });

  it("denies when Redis reports over limit", async () => {
    limit.mockResolvedValue({ success: false });
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("auth.login", "ip:user")).resolves.toBe(false);
  });

  it("denies auth-sensitive requests on Redis timeout (explicit reason)", async () => {
    limit.mockResolvedValue({ success: true, reason: "timeout" });
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("auth.login", "ip:user")).resolves.toBe(false);
    expect(loggerError).toHaveBeenCalledWith(
      "rate limiter timed out",
      expect.objectContaining({ name: "auth.login", decision: "deny" }),
    );
  });

  it("allows public requests on Redis timeout", async () => {
    limit.mockResolvedValue({ success: true, reason: "timeout" });
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("upload.token", "1.2.3.4")).resolves.toBe(true);
    expect(loggerError).toHaveBeenCalledWith(
      "rate limiter timed out",
      expect.objectContaining({ name: "upload.token", decision: "allow" }),
    );
  });

  it("denies tracking.lookup on Redis timeout (fail closed)", async () => {
    limit.mockResolvedValue({ success: true, reason: "timeout" });
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("tracking.lookup", "ip:1.2.3.4")).resolves.toBe(false);
    expect(loggerError).toHaveBeenCalledWith(
      "rate limiter timed out",
      expect.objectContaining({ name: "tracking.lookup", decision: "deny" }),
    );
  });

  it("denies auth-sensitive requests when Redis throws", async () => {
    limit.mockRejectedValue(new Error("redis down"));
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("auth.login", "ip:user")).resolves.toBe(false);
    expect(loggerError).toHaveBeenCalledWith(
      "rate limiter unavailable",
      expect.objectContaining({ name: "auth.login", decision: "deny" }),
    );
  });

  it("allows public requests when Redis throws", async () => {
    limit.mockRejectedValue(new Error("redis down"));
    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("upload.token", "1.2.3.4")).resolves.toBe(true);
  });
});

describe("RATE_LIMIT_DISABLED", () => {
  beforeEach(() => {
    vi.resetModules();
    loggerError.mockReset();
  });

  it("allows all requests when disabled (non-production config path)", async () => {
    vi.doMock("@/env", () => ({
      env: {
        RATE_LIMIT_DISABLED: true,
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "test-token",
      },
    }));
    vi.doMock("@upstash/redis", () => ({
      Redis: vi.fn(function Redis() {
        return {};
      }),
    }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: Object.assign(
        vi.fn(function Ratelimit() {
          return { limit };
        }),
        { slidingWindow: vi.fn(() => ({})) },
      ),
    }));
    vi.doMock("./logger", () => ({
      logger: { error: loggerError, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    }));

    const { checkRateLimit } = await import("./ratelimit");
    await expect(checkRateLimit("auth.login", "anyone")).resolves.toBe(true);
    expect(limit).not.toHaveBeenCalled();
  });
});
