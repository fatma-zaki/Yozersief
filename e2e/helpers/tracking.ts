import { expect, type BrowserContext, type Page, type Response } from "@playwright/test";

/**
 * Deterministic tracking fixtures for Playwright (seeded by `scripts/seed-e2e.ts`).
 * DB-backed specs require these env vars — no defaults — so local runs without a
 * disposable Postgres skip instead of hitting Neon or inventing credentials.
 */
export const trackingFixtures = {
  ref: process.env.E2E_TRACKING_REF ?? "",
  phone: process.env.E2E_TRACKING_PHONE ?? "",
  otherRef: process.env.E2E_TRACKING_OTHER_REF ?? "",
  otherPhone: process.env.E2E_TRACKING_OTHER_PHONE ?? "",
  /** Customer-visible timeline title seeded for assertions. */
  visibleEventTitle: process.env.E2E_TRACKING_VISIBLE_EVENT ?? "تم إرسال الطلب",
  /** Must never appear in customer tracking HTML. */
  hiddenEventNote: process.env.E2E_TRACKING_HIDDEN_NOTE ?? "E2E_STAFF_ONLY_NOTE",
  /** Must never appear in customer tracking HTML. */
  internalNote: process.env.E2E_TRACKING_INTERNAL_NOTE ?? "E2E_INTERNAL_ORDER_NOTE",
};

export const TRACKING_COOKIE_NAME = "yz_track";
export const TRACKING_COOKIE_PATH = "/track";

/** True when CI / a local disposable DB has opted into seeded tracking orders. */
export function hasTrackingDbFixtures(): boolean {
  return Boolean(
    trackingFixtures.ref &&
    trackingFixtures.phone &&
    trackingFixtures.otherRef &&
    trackingFixtures.otherPhone,
  );
}

export async function gotoTrackForm(page: Page) {
  await page.goto("/track");
  await expect(page.getByTestId("track-form")).toBeVisible();
}

export async function fillTrackingLookup(page: Page, ref: string, phone: string) {
  await page.getByLabel("رقم الطلب").fill(ref);
  await page.getByLabel("رقم الموبايل اللي طلبت بيه").fill(phone);
}

export async function submitTrackingLookup(page: Page) {
  await page.getByRole("button", { name: "عرض حالة الطلب" }).click();
}

/** Completes lookup and lands on `/track/[ref]` with a signed session cookie. */
export async function openTrackingSession(page: Page, ref: string, phone: string): Promise<void> {
  await gotoTrackForm(page);
  await fillTrackingLookup(page, ref, phone);
  await submitTrackingLookup(page);
  await page.waitForURL(`**/track/${ref}`);
  await expect(page.getByText(`طلب رقم`)).toBeVisible();
  await expect(page.getByText(ref, { exact: true })).toBeVisible();
}

/** Cookie path is `/track`, so look up against a `/track` URL (not the site root). */
export async function getTrackingCookie(context: BrowserContext, baseURL: string) {
  const trackURL = new URL(TRACKING_COOKIE_PATH, baseURL).toString();
  const cookies = await context.cookies(trackURL);
  return cookies.find((c) => c.name === TRACKING_COOKIE_NAME);
}

/** Sets a raw tracking cookie for session UX tests (path must match ADR-0007). */
export async function setRawTrackingCookie(
  context: BrowserContext,
  baseURL: string,
  value: string,
) {
  // Use domain+path (not url alone): Playwright's url inference can yield Path=/,
  // which would not match the server's clear flags (Path=/track).
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: TRACKING_COOKIE_NAME,
      value,
      domain: url.hostname,
      path: TRACKING_COOKIE_PATH,
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
}

/**
 * Captures Set-Cookie headers that clear or set the tracking cookie on a response.
 * Used to assert path / httpOnly / sameSite without weakening production flags.
 */
export function collectTrackingSetCookieHeaders(page: Page): {
  headers: string[];
  dispose: () => void;
} {
  const headers: string[] = [];
  const onResponse = async (response: Response) => {
    const raw = await response.headersArray();
    for (const h of raw) {
      if (h.name.toLowerCase() === "set-cookie" && h.value.startsWith(`${TRACKING_COOKIE_NAME}=`)) {
        headers.push(h.value);
      }
    }
  };
  page.on("response", onResponse);
  return {
    headers,
    dispose: () => page.off("response", onResponse),
  };
}

export function assertTrackingCookieFlags(setCookie: string, opts: { cleared?: boolean } = {}) {
  expect(setCookie.toLowerCase()).toContain("httponly");
  expect(setCookie.toLowerCase()).toMatch(/samesite=lax/i);
  expect(setCookie).toMatch(new RegExp(`Path=${TRACKING_COOKIE_PATH}`, "i"));
  if (opts.cleared) {
    expect(setCookie).toMatch(/Max-Age=0/i);
  }
}
