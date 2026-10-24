import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { StaffContext } from "@/lib/rbac";
import { defaultPermissionsFor } from "@/lib/rbac";
import { createTestDb, type TestDb } from "./helpers/db";

// Swap the runtime Postgres pool for an in-memory PGlite database with real migrations.
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", () => ({
  get db() {
    return holder.db;
  },
  pingDb: async () => true,
}));
vi.mock("@/env", () => ({
  env: { NODE_ENV: "test", BLOB_READ_WRITE_TOKEN: "test-token", TOKEN_HASH_SECRET: "x".repeat(32) },
}));
const blob = vi.hoisted(() => ({
  head: vi.fn(),
  del: vi.fn(async () => undefined),
  get: vi.fn(),
}));
vi.mock("@vercel/blob", () => blob);

const {
  addSamplePhoto,
  addUploadedPhoto,
  deleteGalleryPhoto,
  getGallery,
  readGalleryImage,
  updateGalleryPhoto,
} = await import("@/modules/content");

let db: TestDb;
let close: () => Promise<void>;
let admin: StaffContext;
let designer: StaffContext;
let desk: StaffContext;
let hoodie: string;
let sticker: string;

const staffContext = (id: string, roleKey: "admin" | "design" | "desk"): StaffContext => ({
  id,
  name: roleKey,
  roleKey,
  sessionId: "s",
  twoFactorEnabled: false,
  permissions: new Set(defaultPermissionsFor(roleKey)),
});

const UPLOAD = "https://store.public.blob.vercel-storage.com/gallery/photo-x1.jpg";

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;
  const [role] = await db.insert(schema.roles).values({ key: "admin", nameAr: "مدير" }).returning();
  const [a] = await db
    .insert(schema.staffUsers)
    .values({
      name: "مدير",
      phone: "01000000099",
      email: "a@x.invalid",
      roleId: role!.id,
      status: "active",
    })
    .returning();
  admin = staffContext(a!.id, "admin");
  designer = staffContext(a!.id, "design");
  desk = staffContext(a!.id, "desk");

  const [h, st] = await db
    .insert(schema.galleryItems)
    .values([
      {
        imageUrl: "/images/home/hoodie.jpg",
        category: "هوديز",
        caption: "هوديز دفعة",
        isSample: true,
        customerConsent: true,
        isPublished: true,
        createdBy: a!.id,
      },
      {
        imageUrl: "/images/home/sticker.jpg",
        category: "استيكرات",
        isSample: true,
        createdBy: a!.id,
      },
    ])
    .returning();
  hoodie = h!.id;
  sticker = st!.id;
});

beforeEach(() => {
  blob.head.mockReset();
  blob.del.mockClear();
});

afterAll(() => close());

const row = async (id: string) =>
  (await db.select().from(schema.galleryItems).where(eq(schema.galleryItems.id, id)))[0];

describe("gallery", () => {
  it("lists photos with their state and counters", async () => {
    const data = await getGallery(designer);
    expect(data.items.map((i) => [i.cat, i.state, i.isSample])).toEqual(
      expect.arrayContaining([
        ["هوديز", "pub", true],
        ["استيكرات", "pending", true],
      ]),
    );
    expect(data.stats).toEqual({ published: 1, hidden: 0, pending: 1 });
    expect(data.uploadMode).toBe("token");
  });

  it("is for roles with gallery.manage only", async () => {
    await expect(getGallery(desk)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("never publishes without the customer's consent", async () => {
    const result = await updateGalleryPhoto(admin, { id: sticker, published: true });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.userMessage).toBe("مينفعش تنشر الصورة من غير موافقة العميل.");
    expect((await row(sticker))?.isPublished).toBe(false);
  });

  it("publishes after consent, and withdrawing consent takes it off the site", async () => {
    expect((await updateGalleryPhoto(admin, { id: sticker, consent: true })).ok).toBe(true);
    expect((await row(sticker))?.consentAt).toBeInstanceOf(Date);
    const published = await updateGalleryPhoto(admin, { id: sticker, published: true });
    expect(published.ok && published.value.state).toBe("pub");

    const withdrawn = await updateGalleryPhoto(admin, { id: sticker, consent: false });
    expect(withdrawn.ok && withdrawn.value).toEqual({
      state: "pending",
      unpublishedByConsent: true,
    });
    const r = await row(sticker);
    expect([r?.customerConsent, r?.isPublished, r?.consentAt]).toEqual([false, false, null]);
  });

  it("saves captions and audits every change", async () => {
    await updateGalleryPhoto(admin, { id: hoodie, caption: "هوديز دفعة 2026" });
    expect((await row(hoodie))?.caption).toBe("هوديز دفعة 2026");
    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.entityId, hoodie));
    expect(logs.map((l) => l.action)).toContain("gallery.updated");
  });

  it("records an uploaded photo from storage facts, once", async () => {
    blob.head.mockResolvedValue({
      url: UPLOAD,
      pathname: "gallery/photo-x1.jpg",
      contentType: "image/jpeg",
      size: 120_000,
    });
    const first = await addUploadedPhoto(admin, { url: UPLOAD, pathname: "gallery/photo-x1.jpg" });
    const again = await addUploadedPhoto(admin, { url: UPLOAD, pathname: "gallery/photo-x1.jpg" });
    expect(first.ok && again.ok && first.value.id === again.value.id).toBe(true);
    if (!first.ok) return;
    expect(await row(first.value.id)).toMatchObject({
      storageKey: UPLOAD,
      category: "جديدة",
      isSample: false,
      customerConsent: false,
      isPublished: false,
    });
  });

  it("serves uploaded photos through our route: staff always, everyone else once published", async () => {
    const id = (await getGallery(admin)).items.find((i) => i.img.startsWith("/api/"))!.id;
    expect((await getGallery(admin)).items.find((i) => i.id === id)?.img).toBe(
      `/api/gallery/image/${id}`,
    );
    blob.get.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      blob: { contentType: "image/jpeg", size: 120_000 },
    });
    await expect(readGalleryImage(null, id)).rejects.toMatchObject({ code: "not_found" });
    expect((await readGalleryImage(designer, id)).published).toBe(false);
    await updateGalleryPhoto(admin, { id, consent: true, published: true });
    expect((await readGalleryImage(null, id)).published).toBe(true);
    expect(blob.get).toHaveBeenCalledWith(UPLOAD, expect.objectContaining({ access: "public" }));
    await updateGalleryPhoto(admin, { id, consent: false });
  });

  it("refuses uploads outside the gallery path or of the wrong type", async () => {
    const outside = await addUploadedPhoto(admin, { url: UPLOAD, pathname: "orders/x.jpg" });
    expect(outside.ok).toBe(false);

    blob.head.mockResolvedValue({
      url: `${UPLOAD}.pdf`,
      pathname: "gallery/doc.pdf",
      contentType: "application/pdf",
      size: 10,
    });
    const pdf = await addUploadedPhoto(admin, {
      url: `${UPLOAD}.pdf`,
      pathname: "gallery/doc.pdf",
    });
    expect(pdf.ok).toBe(false);
    expect(blob.del).toHaveBeenCalledWith(`${UPLOAD}.pdf`, expect.anything());
  });

  it("adds sample photos and deletes photos, removing uploaded files from storage", async () => {
    const sample = await addSamplePhoto(admin);
    expect(sample.ok).toBe(true);
    if (!sample.ok) return;
    expect((await row(sample.value.id))?.isSample).toBe(true);
    await deleteGalleryPhoto(admin, { id: sample.value.id });
    expect(await row(sample.value.id)).toBeUndefined();
    expect(blob.del).not.toHaveBeenCalled();

    const uploaded = (await getGallery(admin)).items.find((i) =>
      i.img.startsWith("/api/gallery/image/"),
    )!;
    await deleteGalleryPhoto(admin, { id: uploaded.id });
    expect(await row(uploaded.id)).toBeUndefined();
    expect(blob.del).toHaveBeenCalledWith(UPLOAD, expect.anything());
  });
});
