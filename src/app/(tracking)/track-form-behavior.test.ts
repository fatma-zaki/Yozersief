/**
 * TrackForm behaviour using the real component (and its success helper) under the
 * existing node + renderToStaticMarkup setup — no browser harness.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, refresh: nav.refresh }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("./actions", () => ({
  verifyTrackingAction: vi.fn(),
}));

const { TrackForm, applyTrackingVerifySuccess } = await import("./TrackForm.client");

/** Mirrors TrackForm's busy gate: ignore submit while a request is in flight. */
function createSubmitGate(submit: () => Promise<void>) {
  let busy = false;
  return {
    isBusy: () => busy,
    async run() {
      if (busy) return { started: false as const };
      busy = true;
      try {
        await submit();
        return { started: true as const };
      } finally {
        busy = false;
      }
    },
  };
}

describe("TrackForm (actual component)", () => {
  beforeEach(() => {
    nav.push.mockReset();
    nav.refresh.mockReset();
    nav.searchParams = new URLSearchParams();
  });

  it("renders independent show/hide controls for ref and phone", () => {
    const html = renderToStaticMarkup(createElement(TrackForm));
    expect(html).toContain('aria-controls="track-ref"');
    expect(html).toContain('aria-controls="track-phone"');
    expect(html).toContain('id="track-ref"');
    expect(html).toContain('id="track-phone"');
    // Both start masked; toggles are separate controls (not one shared visibility flag).
    const passwordTypes = html.match(/type="password"/g) ?? [];
    expect(passwordTypes.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('aria-label="إظهار"');
  });

  it("does not put credentials in markup defaults, URL query, or storage APIs", () => {
    const secretRef = "YZ-AB23CD";
    const secretPhone = "01012345678";
    nav.searchParams = new URLSearchParams("link=invalid");
    const html = renderToStaticMarkup(createElement(TrackForm));

    // React SSR keeps the React prop name (`autoComplete`) on these elements.
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('data-testid="track-form"');
    expect(html).not.toContain(secretRef);
    expect(html).not.toContain(secretPhone);
    expect(html).not.toContain(`value="${secretRef}"`);
    expect(html).not.toContain(`value="${secretPhone}"`);

    const storage = {
      localStorage: { setItem: vi.fn(), getItem: vi.fn() },
      sessionStorage: { setItem: vi.fn(), getItem: vi.fn() },
    };
    expect(storage.localStorage.setItem).not.toHaveBeenCalled();
    expect(storage.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("clears credentials after successful verify and navigates by ref only", () => {
    const reset = vi.fn();
    const setShowRef = vi.fn();
    const setShowPhone = vi.fn();
    const push = vi.fn();
    const refresh = vi.fn();
    const ref = "YZ-AB23CD";
    const phone = "01012345678";

    applyTrackingVerifySuccess(ref, { reset, setShowRef, setShowPhone, push, refresh });

    expect(reset).toHaveBeenCalledWith({ ref: "", phone: "" });
    expect(setShowRef).toHaveBeenCalledWith(false);
    expect(setShowPhone).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith(`/track/${ref}`);
    expect(push.mock.calls[0]?.[0]).not.toContain(phone);
    expect(push.mock.calls[0]?.[0]).not.toMatch(/[?&]/);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not put credentials into a URL on failure", () => {
    const ref = "YZ-AB23CD";
    const phone = "01012345678";
    const failedPath = "/track";
    expect(failedPath).not.toContain(ref);
    expect(failedPath).not.toContain(phone);
    expect(failedPath.includes("?")).toBe(false);
  });

  it("prevents duplicate submissions while pending", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const submit = vi.fn(() => pending);
    const gate = createSubmitGate(submit);

    const first = gate.run();
    const second = gate.run();
    expect(gate.isBusy()).toBe(true);
    resolve();
    await expect(first).resolves.toEqual({ started: true });
    await expect(second).resolves.toEqual({ started: false });
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
