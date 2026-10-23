import { expect, test } from "@playwright/test";
import {
  assertTrackingCookieFlags,
  collectTrackingSetCookieHeaders,
  fillTrackingLookup,
  getTrackingCookie,
  gotoTrackForm,
  hasTrackingDbFixtures,
  openTrackingSession,
  setRawTrackingCookie,
  submitTrackingLookup,
  TRACKING_COOKIE_NAME,
  trackingFixtures,
} from "./helpers/tracking";

/**
 * Customer order tracking E2E (ADR-0007).
 *
 * DB-free scenarios run against any local/CI server without querying Postgres.
 * Lookup / session-binding / DTO boundary scenarios require seeded fixtures
 * (`pnpm tsx scripts/seed-e2e.ts` + `E2E_TRACKING_*` env). They skip otherwise
 * so local agents never hit Neon.
 */

test.describe("D. Token route (ADR-0007)", () => {
  test("/t/[token] redirects to manual entry with invalid-link warning", async ({ page }) => {
    await page.goto("/t/any-public-token-value");
    await expect(page).toHaveURL(/\/track\?link=invalid/);
    await expect(page.getByRole("status")).toContainText(
      "اللينك ده مش شغال أو انتهى. اكتب رقم الطلب يدويًا.",
    );
    await expect(page.getByTestId("track-form")).toBeVisible();
    // No OTP / token-auth UI (ADR-0007) — only ref + phone.
    await expect(page.getByLabel("الكود")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "التحقق بخطوتين" })).toHaveCount(0);
  });
});

test.describe("A. Tracking lookup — input & DB-free", () => {
  test("malformed input is rejected in the form without navigating away", async ({ page }) => {
    await gotoTrackForm(page);
    await fillTrackingLookup(page, "not-a-ref", "123");
    await submitTrackingLookup(page);

    await expect(page).toHaveURL(/\/track\/?$/);
    await expect(page.getByText("رقم الطلب مش بالصيغة الصحيحة (YZ-XXXXXX).")).toBeVisible();
    await expect(page.getByText(/رقم الموبايل لازم يكون مصري|اكتب رقم الموبايل/)).toBeVisible();
  });

  test("empty submit shows required field messages", async ({ page }) => {
    await gotoTrackForm(page);
    await submitTrackingLookup(page);
    await expect(page.getByText("اكتب رقم الطلب.")).toBeVisible();
    await expect(page.getByText("اكتب رقم الموبايل.")).toBeVisible();
    await expect(page).toHaveURL(/\/track\/?$/);
  });
});

test.describe("A. Tracking lookup — seeded DB", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      !hasTrackingDbFixtures(),
      "E2E_TRACKING_* fixtures not set (needs disposable DB + seed-e2e)",
    );
  });

  test("valid reference and phone open the customer tracking page", async ({ page }) => {
    const { ref, phone, visibleEventTitle } = trackingFixtures;
    await openTrackingSession(page, ref, phone);
    await expect(page.getByRole("heading", { name: "تم الإرسال" })).toBeVisible();
    await expect(page.getByText(visibleEventTitle)).toBeVisible();
    await expect(page.getByRole("button", { name: "خروج من التتبّع" })).toBeVisible();
  });

  test("invalid credentials use the same non-enumerating error", async ({ page }) => {
    const { ref, phone, otherPhone } = trackingFixtures;
    const generic = "رقم الطلب أو رقم الموبايل مش متطابقين. راجع البيانات وجرّب تاني.";

    await gotoTrackForm(page);
    await fillTrackingLookup(page, ref, otherPhone);
    await submitTrackingLookup(page);
    await expect(page.getByRole("alert")).toHaveText(generic);
    await expect(page).toHaveURL(/\/track\/?$/);

    await fillTrackingLookup(page, "YZ-ZZZZZZ", phone);
    await submitTrackingLookup(page);
    await expect(page.getByRole("alert")).toHaveText(generic);
    await expect(page).toHaveURL(/\/track\/?$/);
  });

  test("rate limiting is not asserted here (CI disables limiter; covered by unit tests)", async () => {
    test.skip(
      true,
      "tracking.lookup rate limits are unit-tested; CI sets RATE_LIMIT_DISABLED and hammering the limit is flaky",
    );
  });
});

test.describe("B. Tracking session — DB-free UX", () => {
  test("absent session shows unauthenticated tracking UX", async ({ page }) => {
    await page.goto("/track/YZ-AAAAAA");
    await expect(
      page.getByText("مفيش جلسة تتبّع. اكتب رقم الطلب ورقم الموبايل الأول."),
    ).toBeVisible();
    await expect(page.getByText("محتاج تتأكد من الطلب الأول عشان تشوف التفاصيل.")).toBeVisible();
    await expect(page.getByRole("link", { name: "عرض حالة الطلب" })).toBeVisible();
  });

  test("malformed cookie shows expired/invalid UX and clears the cookie", async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(!baseURL, "baseURL required");
    const capture = collectTrackingSetCookieHeaders(page);
    await setRawTrackingCookie(context, baseURL!, "v1.not-a-valid.session");
    const before = await getTrackingCookie(context, baseURL!);
    expect(before?.value).toBe("v1.not-a-valid.session");
    expect(before?.path).toBe("/track");

    await page.goto("/track/YZ-AAAAAA");
    await expect(
      page.getByText("انتهت جلسة التتبّع. اكتب رقم الطلب ورقم الموبايل تاني."),
    ).toBeVisible();

    await expect
      .poll(async () => (await getTrackingCookie(context, baseURL!)) ?? null, {
        timeout: 10_000,
      })
      .toBeNull();

    await expect.poll(() => capture.headers.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const clearHeader = capture.headers.find((h) => /Max-Age=0/i.test(h));
    expect(clearHeader).toBeTruthy();
    assertTrackingCookieFlags(clearHeader!, { cleared: true });
    capture.dispose();
  });
});

test.describe("B. Tracking session — seeded DB", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      !hasTrackingDbFixtures(),
      "E2E_TRACKING_* fixtures not set (needs disposable DB + seed-e2e)",
    );
  });

  test("valid session can access its matching order", async ({ page, context, baseURL }) => {
    test.skip(!baseURL, "baseURL required");
    const { ref, phone } = trackingFixtures;
    const capture = collectTrackingSetCookieHeaders(page);
    await openTrackingSession(page, ref, phone);

    const cookie = await getTrackingCookie(context, baseURL!);
    expect(cookie).toBeTruthy();
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.path).toBe("/track");
    expect(cookie!.sameSite).toBe("Lax");

    const setHeader = capture.headers.find((h) => h.startsWith(`${TRACKING_COOKIE_NAME}=`));
    expect(setHeader).toBeTruthy();
    assertTrackingCookieFlags(setHeader!);
    capture.dispose();

    await page.goto(`/track/${ref}`);
    await expect(page.getByText(ref, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "خروج من التتبّع" })).toBeVisible();
  });

  test("session bound to one order cannot open another via URL ref", async ({ page }) => {
    const { ref, phone, otherRef } = trackingFixtures;
    await openTrackingSession(page, ref, phone);

    await page.goto(`/track/${otherRef}`);
    await expect(
      page.getByText("الجلسة دي مش لنفس رقم الطلب. اكتب رقم الطلب ورقم الموبايل تاني."),
    ).toBeVisible();
    // Must not imply whether otherRef exists or show its timeline.
    await expect(page.getByText(otherRef, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "خروج من التتبّع" })).toHaveCount(0);
  });

  test("logout clears the session cookie", async ({ page, context, baseURL }) => {
    test.skip(!baseURL, "baseURL required");
    const { ref, phone } = trackingFixtures;
    await openTrackingSession(page, ref, phone);
    expect(await getTrackingCookie(context, baseURL!)).toBeTruthy();

    await page.getByRole("button", { name: "خروج من التتبّع" }).click();
    await page.waitForURL("**/track");
    await expect.poll(async () => (await getTrackingCookie(context, baseURL!)) ?? null).toBeNull();
  });
});

test.describe("C. Customer data boundaries — seeded DB", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(
      !hasTrackingDbFixtures(),
      "E2E_TRACKING_* fixtures not set (needs disposable DB + seed-e2e)",
    );
  });

  test("private timeline events and internal notes are not rendered", async ({ page }) => {
    const { ref, phone, visibleEventTitle, hiddenEventNote, internalNote } = trackingFixtures;
    await openTrackingSession(page, ref, phone);

    const body = await page.locator("body").innerText();
    expect(body).toContain(visibleEventTitle);
    expect(body).not.toContain(hiddenEventNote);
    expect(body).not.toContain(internalNote);
    expect(body).not.toContain(phone);
    expect(body).not.toContain("E2E_STAFF_ONLY");
    expect(body).not.toContain("internalNote");
    expect(body).not.toContain("activity_logs");
  });
});
