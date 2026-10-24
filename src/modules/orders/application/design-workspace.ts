import { logActivity } from "@/modules/audit";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { formatShortDateTime } from "@/lib/format";
import { assertCan, type StaffContext } from "@/lib/rbac";
import type { Result } from "@/lib/result";
import {
  canUploadMockup,
  designState,
  isDesignJob,
  mockupVersionNote,
  type DesignState,
  type MockupStatus,
} from "../domain/workspaces";
import {
  flagFileSchema,
  mockupUploadSchema,
  type FlagFileInput,
  type MockupUploadInput,
} from "../schemas";
import { insertOrderEvent, lockOrder } from "../infrastructure/order-repository";
import { blobUploadMode, createFileStorage } from "../infrastructure/vercel-blob-storage";
import {
  ensureMockupFile,
  findLatestMockup,
  insertMockup,
  listMockupsFor,
} from "../infrastructure/workspace-repository";
import { getAdminOrders, inTransaction } from "./admin-orders";
import { completeUploadedFile, type recordUploadedFile } from "./uploads";

export type DesignJobView = {
  id: string;
  ref: string;
  /** «مدرسة النور» or «هبة مصطفى (فرد)». */
  title: string;
  product: string;
  categoryKey: string;
  productKey: string | null;
  state: DesignState;
  /** The customer's change request on the last version («طلب تعديل»). */
  change: string;
  brief: string;
  files: { name: string; url: string; label: string; ok: boolean }[];
  versions: { n: string; note: string; t: string }[];
  /** The latest mockup image, when there is one. */
  preview: string | null;
};

export type DesignData = {
  jobs: DesignJobView[];
  stats: { need: number; change: number; waiting: number };
  /** How the browser uploads to Blob; null when storage is not configured. */
  uploadMode: ReturnType<typeof blobUploadMode>;
};

const IMAGE = /\.(png|jpe?g|svg)$/i;

/**
 * The designer's queue (docs/design/Team-Design.html): business orders at the mockup stage, with
 * the customer's files, the brief and every mockup version. No phones, no prices (brief B9).
 */
export async function getDesignQueue(actor: StaffContext): Promise<DesignData> {
  assertCan(actor, "mockups.manage");
  const data = await getAdminOrders(actor);
  const orders = data.orders.filter((o) =>
    isDesignJob({ status: o.orderStatus, bizStage: o.bizStage, customerType: o.ctype }),
  );
  const mockups = await listMockupsFor(orders.map((o) => o.id));
  const storage = mockups.length ? createFileStorage() : null;

  const jobs = await Promise.all(
    orders.map(async (o): Promise<DesignJobView> => {
      const versions = mockups.filter((m) => m.orderId === o.id);
      const latest = versions.at(-1);
      const state = designState((latest?.status as MockupStatus | undefined) ?? null);
      const preview =
        latest && storage && IMAGE.test(latest.fileName)
          ? await storage.downloadUrl(latest.storageKey)
          : null;
      return {
        id: o.id,
        ref: o.ref,
        title: o.org || `${o.name} (فرد)`,
        product: o.product,
        categoryKey: o.categoryKey,
        productKey: o.productKey,
        state,
        change: state === "change" ? (latest?.customerFeedback ?? "") : "",
        brief: o.notes || o.specs.map((s) => `${s.k}: ${s.v}`).join(" · "),
        files: o.files
          .filter((f) => f.kind !== "mockup")
          .map((f) => ({
            name: f.name,
            url: f.url,
            ...(f.kind === "names_sheet"
              ? { label: "جدول أسماء", ok: true }
              : f.lowRes
                ? { label: "دقة منخفضة", ok: false }
                : { label: "جودة جيدة", ok: true }),
          })),
        versions: versions.map((m) => ({
          n: `نسخة ${m.version}`,
          note: mockupVersionNote(m.status as MockupStatus),
          t: formatShortDateTime(m.sentAt ?? m.uploadedAt),
        })),
        preview,
      };
    }),
  );
  const count = (...s: DesignState[]) => jobs.filter((j) => s.includes(j.state)).length;
  return {
    jobs,
    stats: { need: count("need"), change: count("change"), waiting: count("waiting", "sent") },
    uploadMode: blobUploadMode(),
  };
}

/**
 * «ارفع نسخة موكاب جديدة»: the browser uploaded the file to Blob; this checks it on storage
 * (size, type, path) and records the new version, which goes to the desk (status with_desk).
 */
export async function submitMockup(
  actor: StaffContext,
  raw: MockupUploadInput,
): Promise<Result<{ ref: string; version: number }>> {
  assertCan(actor, "mockups.manage");
  const input = mockupUploadSchema.parse(raw);

  let checked: Parameters<typeof recordUploadedFile>[0] | null = null;
  await completeUploadedFile(
    { url: input.url, pathname: input.pathname, contentType: input.contentType },
    {
      orderId: input.orderId,
      kind: "mockup",
      staffId: actor.id,
      requestedPathname: input.requestedPathname,
    },
    {
      record: async (file) => {
        checked = file;
      },
    },
  );
  const file = checked as Parameters<typeof recordUploadedFile>[0] | null;
  if (!file) throw new ValidationError({}, "لم يُرفع الملف. ارفعه مرة أخرى.");

  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    if (!isDesignJob(order)) {
      throw new ConflictError("not at mockup", "هذا الطلب ليس في مرحلة الموكاب.");
    }
    const latest = await findLatestMockup(order.id, tx);
    if (!canUploadMockup(designState(latest?.status ?? null))) {
      throw new ConflictError(
        "mockup pending",
        "توجد نسخة ما زالت لدى الاستقبال أو العميل. انتظر الرد أولًا.",
      );
    }
    const fileRow = await ensureMockupFile(
      {
        orderId: order.id,
        fileName: file.pathname.split("/").pop() ?? file.pathname,
        mimeType: file.contentType,
        sizeBytes: file.sizeBytes,
        storageKey: file.url,
        uploadedBy: actor.id,
      },
      tx,
    );
    const mockup = await insertMockup(
      { orderId: order.id, fileId: fileRow.id, designerId: actor.id },
      tx,
    );
    await insertOrderEvent(
      {
        orderId: order.id,
        type: "mockup_uploaded",
        titleAr: `رُفعت نسخة موكاب ${mockup.version} — عند الاستقبال`,
        note: null,
        visibleToCustomer: false,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "mockups.uploaded",
      entityType: "mockup",
      entityId: mockup.id,
      orderId: order.id,
      meta: { version: mockup.version },
    });
    return { ref: order.ref, version: mockup.version };
  });
}

/** «أبلغ الاستقبال بمشكلة في الملف»: an internal note the desk sees on the order. */
export async function flagCustomerFiles(
  actor: StaffContext,
  raw: FlagFileInput,
): Promise<Result<{ ref: string }>> {
  assertCan(actor, "mockups.manage");
  const input = flagFileSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockOrder(input.orderId, tx);
    if (!order) throw new NotFoundError(`order ${input.orderId}`);
    await insertOrderEvent(
      {
        orderId: order.id,
        type: "files_flagged",
        titleAr: "أبلغ المصمم عن مشكلة في ملفات العميل",
        note: input.note || null,
        visibleToCustomer: false,
        actorId: actor.id,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "mockups.files_flagged",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
    });
    return { ref: order.ref };
  });
}
