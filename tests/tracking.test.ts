import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { createTestDb, type TestDb } from "./helpers/db";

type CookieSetCall = {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
  };
};

const holder = vi.hoisted(() => ({
  db: null as unknown,
  rateLimit: vi.fn(async () => true) as ReturnType<
    typeof vi.fn<(name: string, id: string) => Promise<boolean>>
  >,
  cookieStore: new Map<string, string>(),
  cookieSets: [] as CookieSetCall[],
}));

vi.mock("@/db/client", () => ({
  get db() {
    return holder.db;
  },
  pingDb: async () => true,
}));

vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "test",
    TOKEN_HASH_SECRET: "test-token-hash-secret-32chars!!",
    TRACKING_COOKIE_SECRET: "test-tracking-cookie-secret-32ch!",
    MESSAGING_PROVIDER: "manual",
    RATE_LIMIT_DISABLED: false,
  },
}));

vi.mock("@/lib/ratelimit", async () => {
  const actual = await vi.importActual("@/lib/ratelimit");
  return {
    ...(actual as Record<string, unknown>),
    checkRateLimit: (name: string, id: string) => holder.rateLimit(name, id),
    enforceRateLimit: async (name: string, id: string) => {
      if (!(await holder.rateLimit(name, id))) {
        const { RateLimitedError } = await import("@/lib/errors");
        throw new RateLimitedError(name);
      }
    },
    clientIp: () => "203.0.113.10",
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = holder.cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, options?: CookieSetCall["options"]) => {
      holder.cookieSets.push({ name, value, options });
      if (!value || value === "") holder.cookieStore.delete(name);
      else holder.cookieStore.set(name, value);
    },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.10" }),
}));

const { verifyTrackingLookup } = await import("@/modules/tracking/application/verify-lookup");
const { getCustomerTrackingView } =
  await import("@/modules/tracking/application/get-tracking-view");
const {
  setTrackingSessionCookie,
  readTrackingSession,
  readTrackingSessionOrderId,
  clearTrackingSessionCookie,
} = await import("@/modules/tracking/application/session-cookie");
const {
  openTrackingSession,
  sealTrackingSession,
  trackingSessionClearCookieOptions,
  trackingSessionGateMessage,
  TRACKING_COOKIE_NAME,
  TRACKING_COOKIE_PATH,
  TRACKING_SESSION_TTL_SECONDS,
} = await import("@/modules/tracking");
const { verifyTrackingAction, logoutTrackingAction } = await import("@/app/(tracking)/actions");
const { customerDtoHasProhibitedFields } = await import("@/modules/tracking");
const { env } = await import("@/env");

let db: TestDb;
let close: () => Promise<void>;
let orderId: string;
let otherOrderId: string;
const phone = "01012345678";
const wrongPhone = "01111111111";
const ref = "YZ-TRCK2A";
const otherRef = "YZ-TRCK2B";

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;

  await db.insert(schema.productCategories).values({
    key: "custom",
    nameAr: "فكرة",
    imageUrl: "/x.svg",
    sortOrder: 1,
    isVisible: true,
  });
  const [cat] = await db.select().from(schema.productCategories).limit(1);

  const [customer] = await db.insert(schema.customers).values({ name: "منى", phone }).returning();
  const [otherCustomer] = await db
    .insert(schema.customers)
    .values({ name: "أحمد", phone: wrongPhone })
    .returning();

  const [order] = await db
    .insert(schema.orders)
    .values({
      ref,
      customerId: customer!.id,
      customerType: "person",
      categoryId: cat!.id,
      status: "submitted",
      receiptMethod: "pickup",
      notes: "ملاحظة داخلية مش للعميل",
      internalNote: "سر الموظفين",
    })
    .returning();
  orderId = order!.id;

  const [other] = await db
    .insert(schema.orders)
    .values({
      ref: otherRef,
      customerId: otherCustomer!.id,
      customerType: "person",
      categoryId: cat!.id,
      status: "in_review",
      receiptMethod: "delivery",
    })
    .returning();
  otherOrderId = other!.id;

  await db.insert(schema.orderEvents).values([
    {
      orderId,
      type: "submitted",
      titleAr: "تم إرسال الطلب",
      note: "وصلنا طلبك",
      visibleToCustomer: true,
    },
    {
      orderId,
      type: "staff_note",
      titleAr: "ملاحظة داخلية",
      note: "كلّم المصمم",
      visibleToCustomer: false,
    },
  ]);
});

afterAll(() => close());

beforeEach(() => {
  holder.cookieStore.clear();
  holder.cookieSets.length = 0;
  holder.rateLimit.mockReset();
  holder.rateLimit.mockResolvedValue(true);
});

describe("verifyTrackingLookup", () => {
  it("succeeds for matching ref + registered phone", async () => {
    const result = await verifyTrackingLookup({ ref, phone });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ orderId, ref });
  });

  it("fails generically for wrong phone", async () => {
    const result = await verifyTrackingLookup({ ref, phone: wrongPhone });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.userMessage).toMatch(/غير متطابقين/);
  });

  it("fails generically for nonexistent ref", async () => {
    const result = await verifyTrackingLookup({ ref: "YZ-ZZZZZZ", phone });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.userMessage).toMatch(/غير متطابقين/);
  });
});

describe("getCustomerTrackingView", () => {
  it("returns a safe DTO with only customer-visible events", async () => {
    const result = await getCustomerTrackingView(orderId, ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(customerDtoHasProhibitedFields(result.value)).toBe(false);
    expect(result.value.events.map((e) => e.titleAr)).toEqual(["تم إرسال الطلب"]);
    expect(JSON.stringify(result.value)).not.toContain(phone);
    expect(JSON.stringify(result.value)).not.toContain("سر الموظفين");
    expect(JSON.stringify(result.value)).not.toContain("كلّم المصمم");
  });

  it("rejects using a session order against a different ref", async () => {
    const result = await getCustomerTrackingView(orderId, otherRef);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });

  it("handles a missing order safely", async () => {
    const result = await getCustomerTrackingView("99999999-9999-4999-8999-999999999999", ref);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing expectedRef", async () => {
    const result = await getCustomerTrackingView(orderId, "");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });

  it("rejects an invalid expectedRef", async () => {
    const result = await getCustomerTrackingView(orderId, "not-a-ref");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });
});

describe("tracking session cookie", () => {
  it("sets, reads, and clears the cookie with ADR-0007 flags", async () => {
    await setTrackingSessionCookie(orderId);
    expect(holder.cookieStore.has(TRACKING_COOKIE_NAME)).toBe(true);
    const setCall = holder.cookieSets.at(-1);
    expect(setCall?.name).toBe(TRACKING_COOKIE_NAME);
    expect(setCall?.options).toEqual({
      httpOnly: true,
      // env mock uses NODE_ENV=test → secure false; production covered in session unit tests.
      secure: false,
      sameSite: "lax",
      path: TRACKING_COOKIE_PATH,
      maxAge: TRACKING_SESSION_TTL_SECONDS,
    });
    const raw = holder.cookieStore.get(TRACKING_COOKIE_NAME)!;
    const session = await openTrackingSession(raw, env.TRACKING_COOKIE_SECRET);
    expect(session?.oid).toBe(orderId);
    expect(await readTrackingSessionOrderId()).toBe(orderId);

    await clearTrackingSessionCookie();
    const clearCall = holder.cookieSets.at(-1);
    expect(clearCall?.options).toEqual(
      trackingSessionClearCookieOptions(env.NODE_ENV === "production"),
    );
    expect(clearCall?.options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: TRACKING_COOKIE_PATH,
      maxAge: 0,
    });
    expect(holder.cookieStore.has(TRACKING_COOKIE_NAME)).toBe(false);
    expect(await readTrackingSessionOrderId()).toBeNull();
  });

  it("readTrackingSession distinguishes absent, invalid, and authenticated", async () => {
    expect(await readTrackingSession()).toEqual({ status: "absent" });

    holder.cookieStore.set(TRACKING_COOKIE_NAME, "v1.not-a-valid.session");
    expect(await readTrackingSession()).toEqual({ status: "invalid" });

    const expired = await sealTrackingSession(
      orderId,
      env.TRACKING_COOKIE_SECRET,
      new Date("2020-01-01T00:00:00.000Z"),
      60,
    );
    holder.cookieStore.set(TRACKING_COOKIE_NAME, expired);
    expect(await readTrackingSession()).toEqual({ status: "invalid" });

    await setTrackingSessionCookie(orderId);
    expect(await readTrackingSession()).toEqual({
      status: "authenticated",
      orderId,
    });
  });

  it("clears an invalid cookie with the same options as logout", async () => {
    holder.cookieStore.set(TRACKING_COOKIE_NAME, "v1.tampered.payload");
    expect(await readTrackingSession()).toEqual({ status: "invalid" });

    await clearTrackingSessionCookie();
    const clearCall = holder.cookieSets.at(-1);
    expect(clearCall?.name).toBe(TRACKING_COOKIE_NAME);
    expect(clearCall?.options).toEqual(trackingSessionClearCookieOptions(false));
    expect(holder.cookieStore.has(TRACKING_COOKIE_NAME)).toBe(false);
    expect(await readTrackingSession()).toEqual({ status: "absent" });
  });

  it("mismatch and order-missing gates request cookie clear; absent does not", () => {
    expect(trackingSessionGateMessage("absent").clearCookie).toBe(false);
    expect(trackingSessionGateMessage("invalid").clearCookie).toBe(true);
    expect(trackingSessionGateMessage("mismatch").clearCookie).toBe(true);
    expect(trackingSessionGateMessage("order_missing").clearCookie).toBe(true);
  });

  it("logout action clears the cookie", async () => {
    await setTrackingSessionCookie(orderId);
    const result = await logoutTrackingAction();
    expect(result.ok).toBe(true);
    expect(await readTrackingSessionOrderId()).toBeNull();
  });

  it("cannot use session for a different order via the reader", async () => {
    await setTrackingSessionCookie(orderId);
    const sessionOrderId = await readTrackingSessionOrderId();
    expect(sessionOrderId).toBe(orderId);
    const wrong = await getCustomerTrackingView(sessionOrderId!, otherRef);
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) {
      expect(wrong.error.code).toBe("unauthorized");
      expect(trackingSessionGateMessage("mismatch").clearCookie).toBe(true);
    }
    const right = await getCustomerTrackingView(otherOrderId, otherRef);
    expect(right.ok).toBe(true);
  });
});

describe("verifyTrackingAction rate limiting", () => {
  it("enforces the rate-limit threshold", async () => {
    holder.rateLimit.mockResolvedValue(false);
    const result = await verifyTrackingAction({ ref, phone });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/محاولات كثيرة/);
  });

  it("fails closed when the limiter denies (unavailable path)", async () => {
    // Auth-sensitive policy: limiter returns false when Redis unavailable.
    holder.rateLimit.mockResolvedValue(false);
    const result = await verifyTrackingAction({ ref, phone });
    expect(result.ok).toBe(false);
    expect(holder.cookieStore.size).toBe(0);
  });

  it("issues a cookie on success without returning the order id", async () => {
    const result = await verifyTrackingAction({ ref, phone });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ ref });
    expect(Object.keys(result.data)).toEqual(["ref"]);
    expect(await readTrackingSessionOrderId()).toBe(orderId);
  });
});

describe("order row isolation", () => {
  it("does not leak internal notes through the orders table into the DTO", async () => {
    const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    expect(row?.internalNote).toBe("سر الموظفين");
    const view = await getCustomerTrackingView(orderId, ref);
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(JSON.stringify(view.value)).not.toContain("سر الموظفين");
  });
});
