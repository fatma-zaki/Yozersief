import { describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Permission, StaffContext } from "@/lib/rbac";
import { MAX_FILE_BYTES } from "../domain/files";
import type { FileStorage, StoredBlobMeta } from "./file-storage";

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgres://local/test",
    APP_URL: "http://localhost:3000",
  },
}));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/tx", () => ({ withTransaction: vi.fn() }));
vi.mock("@/modules/audit", () => ({ logActivity: vi.fn() }));

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
  };
}

describe("authorizeUpload", () => {
  it("rejects draft uploads without orderId", async () => {
    await expect(
      authorizeUpload(null, "designs/logo.png", { kind: "design" }),
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

  it("no-ops for draft completions without orderId", async () => {
    await expect(
      completeUploadedFile(
        blob,
        { ...payload, orderId: undefined },
        { storage: memoryStorage(null) },
      ),
    ).resolves.toBeUndefined();
  });
});
