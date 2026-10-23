import { expect, test, type Page } from "@playwright/test";

const admin = {
  identifier: process.env.SEED_ADMIN_PHONE ?? "01000000099",
  password: process.env.SEED_ADMIN_PASSWORD ?? "",
};
const desk = {
  identifier: process.env.E2E_DESK_PHONE ?? "01000000010",
  password: process.env.E2E_DESK_PASSWORD ?? "desk-e2e-password",
};

async function signIn(page: Page, who: { identifier: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("الإيميل أو رقم الموبايل").fill(who.identifier);
  await page.getByLabel("كلمة السر", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL("**/dashboard");
}

test("home page loads in Arabic RTL", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("تحكي قصتك");
  await expect(page.getByRole("link", { name: "ابدأ طلبك الآن" }).first()).toBeVisible();
});

test("signed-out visitors are sent to login from the dashboard", async ({ page }) => {
  await page.goto("/dashboard/orders");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Forders/);
});

test("the seeded admin can sign in and open accounts", async ({ page }) => {
  test.skip(!admin.password, "SEED_ADMIN_PASSWORD not set");
  await signIn(page, admin);
  await page.goto("/dashboard/accounts");
  await expect(page.getByRole("heading", { name: "الحسابات والصلاحيات" })).toBeVisible();
});

test("a desk user is forbidden from /dashboard/accounts", async ({ page }) => {
  await signIn(page, desk);
  const response = await page.goto("/dashboard/accounts");
  await expect(page.getByText("الصفحة دي مش ضمن صلاحياتك")).toBeVisible();
  await expect(page.getByRole("button", { name: "اطلب الصلاحية" })).toBeVisible();
  // Desk sees its own workspace in the sidebar, not the admin sections.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "شغل الاستقبال" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "الحسابات والصلاحيات" })).toHaveCount(0);
  expect(response?.status()).toBeLessThan(500);
});
