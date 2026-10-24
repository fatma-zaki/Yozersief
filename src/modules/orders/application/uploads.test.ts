import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Permission, StaffContext } from "@/lib/rbac";
import { draftPathPrefix, MAX_FILE_BYTES } from "../domain/files";
import type { FileStorage, StoredBlobMeta } from "./file-storage";

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgres://local/test",
    APP_URL: "http://localhost:3000",
    TOKEN_HASH_SECRET: "t".repeat(32),
  },
}));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/tx", () => ({ withTransaction: vi.fn() }));
vi.mock("@/modules/audit", () => ({ logActivity: vi.fn() }));
vi.mock("../infrastructure/submit-repository", () => ({
  countDraftsForSubmission: vi.fn(async () => 0),
  insertUploadDraft: vi.fn(async () => ({ id: "draft-1" })),
}));

const { authorizeUpload, completeUploadedFile } = await import("./uploads");

const staff = (
  permissions: Permission[],
  roleKey: StaffContext["roleKey"] = "desk",
): StaffContext => ({
  id: "u1",
  name: "x",
  roleKey,
  sessionId: "s1",
  twoFactorEnabled: true,
  permissions: new Set(permissions),
});

const orderId = "11111111-1111-4111-8111-111111111111";
const submissionKey = "22222222-2222-4222-8222-222222222222";
const orderExists = vi.fn(async () => true);

function memoryStorage(meta: StoredBlobMeta | null, deleted: string[] = []): FileStorage {
  return {
    async delete(key) {
      deleted.push(key);
    },
    async downloadUrl(key) {
      return key;
    },
    async head() {
      if (!meta) throw new Error("not found");
      return meta;
    },
    async read() {
      return null;
    },
  };
}

describe("authorizeUpload", () => {
  it("rejects when neither orderId nor submissionKey is set", async () => {
    await expect(
      authorizeUpload(null, "designs/logo.png", { kind: "design" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when both orderId and submissionKey are set", async () => {
    await expect(
      authorizeUpload(null, `${await draftPathPrefix(submissionKey)}logo.png`, {
        kind: "design",
        orderId,
        submissionKey,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects order uploads without staff", async () => {
    await expect(
      authorizeUpload(null, "designs/logo.png", { kind: "design", orderId }, { orderExists }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects staff lacking orders.view", async () => {
    await expect(
      authorizeUpload(staff([]), "designs/logo.png", { kind: "design", orderId }, { orderExists }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects when the order does not exist", async () => {
    await expect(
      authorizeUpload(
        staff(["orders.view"]),
        "designs/logo.png",
        { kind: "design", orderId },
        { orderExists: async () => false },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows staff with orders.view when the order exists", async () => {
    const result = await authorizeUpload(
      staff(["orders.view"]),
      "designs/logo.png",
      { kind: "design", orderId },
      { orderExists },
    );
    expect(result.maximumSizeInBytes).toBeGreaterThan(0);
    expect(JSON.parse(result.tokenPayload as string)).toMatchObject({
      staffId: "u1",
      orderId,
      requestedPathname: "designs/logo.png",
    });
  });

  it("requires mockups.manage for mockup kind", async () => {
    await expect(
      authorizeUpload(
        staff(["orders.view"]),
        "mockups/a.png",
        { kind: "mockup", orderId },
        { orderExists },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(
      authorizeUpload(
        staff(["orders.view", "mockups.manage"]),
        "mockups/a.png",
        { kind: "mockup", orderId },
        { orderExists },
      ),
    ).resolves.toBeTruthy();
  });

  it("allows anonymous draft uploads under the derived path prefix (not the raw UUID)", async () => {
    const pathname = `${await draftPathPrefix(submissionKey)}logo.png`;
    expect(pathname).not.toContain(submissionKey);
    const result = await authorizeUpload(
      null,
      pathname,
      { kind: "design", submissionKey },
      { hashSecret: "t".repeat(32), countDrafts: async () => 0 },
    );
    expect(JSON.parse(result.tokenPayload as string)).toMatchObject({
      submissionKey,
      staffId: null,
      kind: "design",
    });
  });

  it("rejects draft uploads outside the submission key prefix", async () => {
    await expect(
      authorizeUpload(
        null,
        "other/logo.png",
        { kind: "design", submissionKey },
        { hashSecret: "t".repeat(32), countDrafts: async () => 0 },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a leaked path claimed with a different submission key", async () => {
    const otherKey = "33333333-3333-4333-8333-333333333333";
    const leakedPath = `${await draftPathPrefix(submissionKey)}logo.png`;
    await expect(
      authorizeUpload(
        null,
        leakedPath,
        { kind: "design", submissionKey: otherKey },
        { hashSecret: "t".repeat(32), countDrafts: async () => 0 },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects mockup drafts", async () => {
    await expect(
      authorizeUpload(
        null,
        `${await draftPathPrefix(submissionKey)}m.png`,
        { kind: "mockup", submissionKey },
        { hashSecret: "t".repeat(32), countDrafts: async () => 0 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects when the draft quota is full", async () => {
    await expect(
      authorizeUpload(
        null,
        `${await draftPathPrefix(submissionKey)}logo.png`,
        { kind: "design", submissionKey },
        { hashSecret: "t".repeat(32), countDrafts: async () => 20 },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("completeUploadedFile", () => {
  const blob = {
    url: "https://blob.example/designs/logo-abc.png",
    pathname: "designs/logo-abc.png",
    contentType: "image/png",
  };
  const payload = {
    orderId,
    kind: "design" as const,
    staffId: "u1",
    requestedPathname: "designs/logo.png",
  };

  it("rejects when head() cannot find the blob", async () => {
    await expect(
      completeUploadedFile(blob, payload, { storage: memoryStorage(null) }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects pathname mismatch between callback and head()", async () => {
    await expect(
      completeUploadedFile(blob, payload, {
        storage: memoryStorage({
          size: 100,
          pathname: "other/path.png",
          contentType: "image/png",
          url: blob.url,
        }),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects oversized blobs and attempts delete", async () => {
    const deleted: string[] = [];
    await expect(
      completeUploadedFile(blob, payload, {
        storage: memoryStorage(
          {
            size: MAX_FILE_BYTES + 1,
            pathname: blob.pathname,
            contentType: "image/png",
            url: blob.url,
          },
          deleted,
        ),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(deleted).toContain(blob.url);
  });

  it("rejects disallowed content types from head()", async () => {
    const deleted: string[] = [];
    await expect(
      completeUploadedFile(blob, payload, {
        storage: memoryStorage(
          {
            size: 100,
            pathname: blob.pathname,
            contentType: "application/octet-stream",
            url: blob.url,
          },
          deleted,
        ),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(deleted).toContain(blob.url);
  });

  it("persists actual size from head() on valid completion", async () => {
    const record = vi.fn(async () => undefined);
    await completeUploadedFile(blob, payload, {
      storage: memoryStorage({
        size: 4096,
        pathname: blob.pathname,
        contentType: "image/png",
        url: blob.url,
      }),
      record,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        sizeBytes: 4096,
        contentType: "image/png",
        pathname: blob.pathname,
        url: blob.url,
      }),
    );
  });

  it("no-ops when neither orderId nor submissionKey is set", async () => {
    await expect(
      completeUploadedFile(
        blob,
        { kind: "design", staffId: null },
        { storage: memoryStorage(null) },
      ),
    ).resolves.toBeUndefined();
  });

  it("records a draft when submissionKey is present and pathname matches", async () => {
    const recordDraft = vi.fn(async () => undefined);
    const prefix = await draftPathPrefix(submissionKey);
    const pathname = `${prefix}logo-abc.png`;
    expect(pathname).not.toContain(submissionKey);
    await completeUploadedFile(
      { url: "https://blob.example/" + pathname, pathname, contentType: "image/png" },
      {
        kind: "design",
        submissionKey,
        staffId: null,
        requestedPathname: `${prefix}logo.png`,
      },
      {
        storage: memoryStorage({
          size: 100,
          pathname,
          contentType: "image/png",
          url: "https://blob.example/" + pathname,
        }),
        recordDraft,
      },
    );
    expect(recordDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionKey,
        kind: "design",
        sizeBytes: 100,
      }),
    );
  });

  it("rejects draft completion when pathname does not match the submission key", async () => {
    const deleted: string[] = [];
    await expect(
      completeUploadedFile(
        blob,
        {
          kind: "design",
          submissionKey,
          staffId: null,
          requestedPathname: `${await draftPathPrefix(submissionKey)}logo.png`,
        },
        {
          storage: memoryStorage(
            {
              size: 100,
              pathname: blob.pathname,
              contentType: "image/png",
              url: blob.url,
            },
            deleted,
          ),
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(deleted).toContain(blob.url);
  });

  it("rejects completion of a leaked path with a different submission key", async () => {
    const deleted: string[] = [];
    const otherKey = "33333333-3333-4333-8333-333333333333";
    const pathname = `${await draftPathPrefix(submissionKey)}logo-abc.png`;
    await expect(
      completeUploadedFile(
        { url: "https://blob.example/" + pathname, pathname, contentType: "image/png" },
        {
          kind: "design",
          submissionKey: otherKey,
          staffId: null,
          requestedPathname: `${await draftPathPrefix(otherKey)}logo.png`,
        },
        {
          storage: memoryStorage(
            {
              size: 100,
              pathname,
              contentType: "image/png",
              url: "https://blob.example/" + pathname,
            },
            deleted,
          ),
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(deleted).toContain("https://blob.example/" + pathname);
  });
});
