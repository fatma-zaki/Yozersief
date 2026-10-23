import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDraft, type RequestDraft } from "../../domain/request";

const submitOrderAction = vi.fn();
vi.mock("@/app/(order)/order/actions", () => ({
  submitOrderAction: (...args: unknown[]) => submitOrderAction(...args),
}));

vi.mock("@vercel/blob/client", () => ({
  upload: vi.fn(async (pathname: string) => ({
    url: `https://blob.example/${pathname}`,
    pathname: `${pathname}-abc`,
    contentType: "image/png",
  })),
}));

const {
  submitRequest,
  DEMO_MODE,
  getOrCreateSubmissionKey,
  clearSubmissionKey,
  _resetSubmissionKeyMemoryForTests,
} = await import("./submit");

function customDraft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    ...emptyDraft(),
    ctype: "person",
    cat: "custom",
    desc: "عايز أطباعة فكرة خاصة للمدرسة",
    help: true,
    name: "منى",
    phone: "01012345678",
    receipt: "pickup",
    ...overrides,
  };
}

describe("submitRequest", () => {
  beforeEach(() => {
    submitOrderAction.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  it("is not in demo mode", () => {
    expect(DEMO_MODE).toBe(false);
  });

  it("returns the public ref on success", async () => {
    submitOrderAction.mockResolvedValue({ ok: true, data: { ref: "YZ-AB23CD" } });
    const result = await submitRequest(customDraft(), {
      submissionKey: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      fileBlobs: new Map(),
    });
    expect(result).toEqual({ ok: true, ref: "YZ-AB23CD" });
  });

  it("surfaces actionable server errors and allows retry with the same key", async () => {
    submitOrderAction
      .mockResolvedValueOnce({ ok: false, error: "محاولات كتير ورا بعض." })
      .mockResolvedValueOnce({ ok: true, data: { ref: "YZ-RETRY1" } });

    const key = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const opts = { submissionKey: key, fileBlobs: new Map<string, File>() };

    const first = await submitRequest(customDraft(), opts);
    expect(first).toEqual({ ok: false, error: "محاولات كتير ورا بعض." });

    const second = await submitRequest(customDraft(), opts);
    expect(second).toEqual({ ok: true, ref: "YZ-RETRY1" });
    expect(submitOrderAction).toHaveBeenCalledTimes(2);
    expect(submitOrderAction.mock.calls[0]![0]).toMatchObject({ submissionKey: key });
    expect(submitOrderAction.mock.calls[1]![0]).toMatchObject({ submissionKey: key });
  });

  it("fails when a done file has no local blob (reload case)", async () => {
    const draft = customDraft({
      help: false,
      files: [{ id: "f1", name: "a.png", size: 10, status: "done" }],
    });
    const result = await submitRequest(draft, {
      submissionKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      fileBlobs: new Map(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ارفعه تاني/);
    expect(submitOrderAction).not.toHaveBeenCalled();
  });
});

describe("getOrCreateSubmissionKey", () => {
  afterEach(() => {
    _resetSubmissionKeyMemoryForTests();
    vi.unstubAllGlobals();
  });

  function stubStorage(impl: Storage) {
    vi.stubGlobal("sessionStorage", impl);
  }

  it("keeps one memory key when sessionStorage getter throws", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });

    // Accessing sessionStorage itself must not crash the form.
    const first = getOrCreateSubmissionKey();
    const second = getOrCreateSubmissionKey();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).toBe(first);
  });

  it("keeps one memory key when getItem throws", () => {
    stubStorage({
      getItem() {
        throw new DOMException("Denied", "SecurityError");
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: () => null,
      length: 0,
    });

    const first = getOrCreateSubmissionKey();
    const second = getOrCreateSubmissionKey();
    expect(second).toBe(first);
  });

  it("keeps one memory key when setItem throws", () => {
    const store = new Map<string, string>();
    stubStorage({
      getItem(key) {
        return store.get(key) ?? null;
      },
      setItem() {
        throw new DOMException("QuotaExceeded", "QuotaExceededError");
      },
      removeItem(key) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
      key: () => null,
      length: 0,
    });

    const first = getOrCreateSubmissionKey();
    const second = getOrCreateSubmissionKey();
    expect(second).toBe(first);
    expect(store.size).toBe(0);
  });

  it("reuses the same fallback key across repeated submit attempts", () => {
    stubStorage({
      getItem() {
        throw new Error("no storage");
      },
      setItem() {
        throw new Error("no storage");
      },
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: () => null,
      length: 0,
    });

    const keys = Array.from({ length: 5 }, () => getOrCreateSubmissionKey());
    expect(new Set(keys).size).toBe(1);
    clearSubmissionKey();
    const afterClear = getOrCreateSubmissionKey();
    expect(afterClear).not.toBe(keys[0]);
  });
});
