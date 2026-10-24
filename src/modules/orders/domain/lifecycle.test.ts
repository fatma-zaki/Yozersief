import { describe, expect, it } from "vitest";
import { defaultPermissionsFor, type Permission, type RoleKey } from "@/lib/rbac/permissions";
import {
  availableTransitions,
  BIZ_RAIL,
  BIZ_STAGES,
  ORDER_STATUSES,
  planTransition,
  TRANSITIONS,
  type Actor,
  type BizStage,
  type OrderState,
  type OrderStatus,
  type TransitionContext,
  type TransitionName,
} from "./lifecycle";

const staff = (role: RoleKey): Actor => {
  const perms = new Set<Permission>(defaultPermissionsFor(role));
  return { kind: "staff", id: role, can: (p) => role === "admin" || perms.has(p) };
};
const admin = staff("admin");
const customer: Actor = { kind: "customer" };

/** Context that satisfies every guard, so only from-state and path rules are under test. */
const allGuardsPass: TransitionContext = {
  reason: "سبب",
  quoteText: "عرض",
  mockupApproved: true,
  mockupSent: true,
  depositConfirmed: true,
  qcPassed: true,
};

const person = (status: OrderStatus): OrderState => ({
  status,
  bizStage: null,
  customerType: "person",
});
const biz = (status: OrderStatus, bizStage: BizStage | null): OrderState => ({
  status,
  bizStage,
  customerType: "biz",
});

/**
 * The complete allowed table. Anything not listed here must be rejected.
 * Key: `${transition}|${path}|${status}|${bizStage ?? "-"}`
 */
const PRE = ["submitted", "in_review", "approved"] as const;
/** Every status but delivered, rejected and cancelled: an open order can be cancelled. */
const OPEN = [
  "submitted",
  "in_review",
  "awaiting_customer",
  "approved",
  "in_production",
  "ready",
] as const;
const ALLOWED = new Set<string>();
const allow = (
  t: TransitionName,
  path: "person" | "business",
  status: OrderStatus,
  stage: BizStage | null,
) => ALLOWED.add(`${t}|${path}|${status}|${stage ?? "-"}`);
const BIZ_STAGE_OPTIONS: (BizStage | null)[] = [null, ...BIZ_STAGES];

// Individual path
allow("start_review", "person", "submitted", null);
for (const s of PRE) allow("request_info", "person", s, null);
allow("customer_responded", "person", "awaiting_customer", null);
allow("approve", "person", "in_review", null);
for (const s of [...PRE, "awaiting_customer"] as const) allow("reject", "person", s, null);
for (const s of OPEN) allow("cancel", "person", s, null);
allow("start_production", "person", "approved", null);
allow("mark_ready", "person", "in_production", null);
allow("deliver", "person", "ready", null);

// Business path: status-only rules apply at any biz stage
for (const stage of BIZ_STAGE_OPTIONS) {
  allow("start_review", "business", "submitted", stage);
  for (const s of PRE) allow("request_info", "business", s, stage);
  allow("customer_responded", "business", "awaiting_customer", stage);
  for (const s of [...PRE, "awaiting_customer"] as const) allow("reject", "business", s, stage);
  for (const s of OPEN) allow("cancel", "business", s, stage);
  allow("deliver", "business", "ready", stage);
}
allow("approve_and_send_quote", "business", "in_review", "quote");
allow("accept_quote", "business", "approved", "customer_approval");
allow("approve_mockup", "business", "approved", "mockup");
allow("request_mockup_changes", "business", "approved", "mockup");
allow("confirm_deposit", "business", "approved", "deposit");
allow("start_production", "business", "approved", "production");
allow("send_to_qc", "business", "in_production", "production");
allow("mark_ready", "business", "in_production", "qc");

describe("lifecycle: every transition from every state", () => {
  const cases: [TransitionName, OrderState, boolean][] = [];
  for (const t of TRANSITIONS) {
    for (const status of ORDER_STATUSES) {
      cases.push([t, person(status), ALLOWED.has(`${t}|person|${status}|-`)]);
      for (const stage of BIZ_STAGE_OPTIONS) {
        cases.push([t, biz(status, stage), ALLOWED.has(`${t}|business|${status}|${stage ?? "-"}`)]);
      }
    }
  }

  it(`covers ${cases.length} combinations`, () => {
    expect(cases.length).toBe(
      TRANSITIONS.length * ORDER_STATUSES.length * (1 + BIZ_STAGE_OPTIONS.length),
    );
  });

  it.each(
    cases.map(([t, s, ok]) => [t, s.customerType, s.status, s.bizStage ?? "-", ok, s] as const),
  )("%s on %s %s/%s → allowed=%s", (t, _type, _status, _stage, expected, state) => {
    const result = planTransition(state, t, admin, allGuardsPass);
    expect(result.ok).toBe(expected);
    if (!result.ok) expect(["wrong_path", "invalid_from_state"]).toContain(result.error.code);
  });
});

describe("lifecycle: target states", () => {
  const to = (state: OrderState, t: TransitionName, ctx = allGuardsPass) => {
    const r = planTransition(state, t, admin, ctx);
    if (!r.ok) throw new Error(r.error.message);
    return r.value.to;
  };

  it("walks the individual happy path", () => {
    let s = person("submitted");
    for (const [t, status] of [
      ["start_review", "in_review"],
      ["approve", "approved"],
      ["start_production", "in_production"],
      ["mark_ready", "ready"],
      ["deliver", "delivered"],
    ] as const) {
      s = { ...s, ...to(s, t) };
      expect(s).toMatchObject({ status, bizStage: null });
    }
  });

  it("walks the business happy path through all 7 stages", () => {
    let s = biz("submitted", null);
    const seen: (BizStage | null)[] = [];
    for (const t of [
      "start_review",
      "approve_and_send_quote",
      "accept_quote",
      "request_mockup_changes",
      "approve_mockup",
      "confirm_deposit",
      "start_production",
      "send_to_qc",
      "mark_ready",
      "deliver",
    ] as const) {
      s = { ...s, ...to(s, t) };
      seen.push(s.bizStage);
    }
    expect(s).toMatchObject({ status: "delivered", bizStage: "done" });
    expect(new Set(seen.filter(Boolean))).toEqual(new Set([...BIZ_RAIL, "done"]));
  });

  it("pauses for the customer and resumes where it stopped", () => {
    const paused = to(biz("approved", "mockup"), "request_info");
    expect(paused).toEqual({ status: "awaiting_customer", bizStage: "mockup" });
    const resumed = to({ ...biz("approved", "mockup"), ...paused }, "customer_responded", {
      pausedFrom: "approved",
    });
    expect(resumed).toEqual({ status: "approved", bizStage: "mockup" });
    expect(to(person("awaiting_customer"), "customer_responded", {})).toEqual({
      status: "in_review",
      bizStage: null,
    });
  });
});

describe("lifecycle: guards", () => {
  const code = (state: OrderState, t: TransitionName, ctx: TransitionContext) => {
    const r = planTransition(state, t, admin, ctx);
    return r.ok ? "ok" : r.error.code;
  };

  it("requires a reason to reject, request info and cancel", () => {
    expect(code(person("in_review"), "reject", {})).toBe("guard_failed");
    expect(code(person("in_review"), "reject", { reason: "  " })).toBe("guard_failed");
    expect(code(person("in_review"), "request_info", {})).toBe("guard_failed");
    expect(code(person("in_review"), "cancel", {})).toBe("guard_failed");
  });

  it("requires quote text to approve a business order", () => {
    expect(code(biz("in_review", "quote"), "approve_and_send_quote", {})).toBe("guard_failed");
  });

  it("blocks production without an approved mockup and a confirmed deposit", () => {
    const s = biz("approved", "production");
    expect(code(s, "start_production", { mockupApproved: true })).toBe("guard_failed");
    expect(code(s, "start_production", { depositConfirmed: true })).toBe("guard_failed");
    expect(code(s, "start_production", { mockupApproved: true, depositConfirmed: true })).toBe(
      "ok",
    );
    expect(code(biz("approved", "deposit"), "confirm_deposit", {})).toBe("guard_failed");
  });

  it("requires QC to pass before a business order is ready", () => {
    expect(code(biz("in_production", "qc"), "mark_ready", {})).toBe("guard_failed");
  });

  it("rejects resuming to a state after production", () => {
    expect(code(person("awaiting_customer"), "customer_responded", { pausedFrom: "ready" })).toBe(
      "guard_failed",
    );
  });
});

describe("lifecycle: permissions (B9)", () => {
  const code = (actor: Actor, state: OrderState, t: TransitionName) => {
    const r = planTransition(state, t, actor, allGuardsPass);
    return r.ok ? "ok" : r.error.code;
  };

  it("keeps the final decision with the admin", () => {
    expect(code(staff("desk"), person("in_review"), "approve")).toBe("forbidden");
    expect(code(staff("desk"), person("in_review"), "reject")).toBe("forbidden");
    expect(code(staff("desk"), biz("in_review", "quote"), "approve_and_send_quote")).toBe(
      "forbidden",
    );
    expect(code(staff("delivery"), biz("approved", "deposit"), "confirm_deposit")).toBe(
      "forbidden",
    );
  });

  it("lets each role run its own step", () => {
    expect(code(staff("desk"), person("submitted"), "start_review")).toBe("ok");
    expect(code(staff("desk"), person("in_review"), "request_info")).toBe("ok");
    expect(code(staff("prod"), person("approved"), "start_production")).toBe("ok");
    expect(code(staff("prod"), person("in_production"), "mark_ready")).toBe("ok");
    expect(code(staff("delivery"), person("ready"), "deliver")).toBe("ok");
    expect(code(staff("prod"), person("ready"), "deliver")).toBe("forbidden");
    expect(code(staff("design"), person("submitted"), "start_review")).toBe("forbidden");
  });

  it("lets customers act only on their own decisions", () => {
    expect(code(customer, biz("approved", "customer_approval"), "accept_quote")).toBe("ok");
    expect(code(customer, biz("approved", "mockup"), "approve_mockup")).toBe("ok");
    expect(code(customer, biz("approved", "mockup"), "request_mockup_changes")).toBe("ok");
    expect(code(customer, person("awaiting_customer"), "customer_responded")).toBe("ok");
    expect(code(customer, person("in_review"), "approve")).toBe("forbidden");
    expect(code(customer, person("ready"), "deliver")).toBe("forbidden");
  });

  it("never lets the system actor run a transition", () => {
    expect(code({ kind: "system" }, person("submitted"), "start_review")).toBe("forbidden");
  });
});

describe("lifecycle: plan contents", () => {
  it("produces a customer-visible event, an activity key and the right template", () => {
    const r = planTransition(person("in_review"), "reject", admin, { reason: "التصميم غير واضح" });
    expect(r.ok && r.value).toMatchObject({
      event: {
        type: "rejected",
        titleAr: "مرفوض",
        note: "التصميم غير واضح",
        visibleToCustomer: true,
      },
      message: "reject",
      activity: "orders.reject",
    });
  });

  it("lists available actions for a role", () => {
    expect(availableTransitions(person("in_review"), staff("desk"), allGuardsPass).sort()).toEqual(
      ["cancel", "request_info"].sort(),
    );
    expect(availableTransitions(person("in_production"), staff("prod"), allGuardsPass)).toEqual([
      "mark_ready",
    ]);
    expect(availableTransitions(person("in_review"), admin, allGuardsPass).sort()).toEqual(
      ["approve", "cancel", "reject", "request_info"].sort(),
    );
  });
});
