import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ar } from "@/i18n/ar";
import { TrackingSessionMessage } from "./TrackingSessionMessage";

// Barrel `@/modules/tracking` re-exports server-only cookie/db use cases; stub those
// edges so this UI unit test can import the public API without a real env/DB.
vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://localhost/test",
    BETTER_AUTH_SECRET: "test-better-auth-secret-32chars!!",
    TOKEN_HASH_SECRET: "test-token-hash-secret-32chars!!",
    TRACKING_COOKIE_SECRET: "test-tracking-cookie-secret-32ch!",
    CRON_SECRET: "test-cron-secret-16",
    MESSAGING_PROVIDER: "manual",
    RATE_LIMIT_DISABLED: true,
  },
}));
vi.mock("@/db/client", () => ({
  db: {},
  pingDb: async () => true,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const { trackingSessionGateMessage } = await import("@/modules/tracking");

describe("tracking UI states", () => {
  it("renders never-auth copy distinctly from expired-session copy", () => {
    const absent = trackingSessionGateMessage("absent");
    const expired = trackingSessionGateMessage("invalid");
    const absentHtml = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: absent.title,
        body: absent.body,
      }),
    );
    const expiredHtml = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: expired.title,
        body: expired.body,
      }),
    );
    expect(absentHtml).toContain(ar.tracking.sessionRequired);
    expect(absentHtml).not.toContain(ar.tracking.sessionExpired);
    expect(expiredHtml).toContain(ar.tracking.sessionExpired);
    expect(expiredHtml).toContain('href="/track"');
  });

  it("renders mismatch copy distinctly from expired and never-auth", () => {
    const mismatch = trackingSessionGateMessage("mismatch");
    const html = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: mismatch.title,
        body: mismatch.body,
      }),
    );
    expect(html).toContain(ar.tracking.sessionMismatch);
    expect(html).not.toContain(ar.tracking.sessionExpired);
    expect(html).not.toContain(ar.tracking.sessionRequired);
  });

  it("renders a generic error state", () => {
    const html = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: ar.tracking.loadError,
        body: "حدثت مشكلة لدينا.",
      }),
    );
    expect(html).toContain("تعذّر جلب حالة الطلب");
  });
});
