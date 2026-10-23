import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import { env } from "@/env";
import { ConflictError, ValidationError } from "@/lib/errors";
import { cairoDateString } from "@/lib/format";
import { generateOrderRef } from "@/lib/ids";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { err, ok, type Result } from "@/lib/result";
import { hashToken } from "@/lib/tokens";
import { WEAR_SIZES } from "@/modules/catalog";
import { hasSizeSplit, isOrg, toDecimal, toInt } from "../domain/request";
import type { SubmitOrderInput } from "../schemas";
import {
  claimDraftsToOrder,
  createOrganization,
  findCategoryIdByKey,
  findOrderRefByIdempotencyHash,
  findProductIdByKey,
  insertOrderPlaces,
  insertOrderSizes,
  insertSubmittedEvent,
  insertSubmittedOrder,
  isUniqueViolation,
  linkOrganizationContact,
  listLiveDrafts,
  upsertCustomerByPhone,
  type InsertOrderValues,
} from "../infrastructure/submit-repository";

export type SubmitOrderResult = {
  /** Public order reference only (brief B5). Never return internal ids or prices. */
  ref: string;
};

const REF_ATTEMPTS = 8;

function nullIfEmpty(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

function buildOrderValues(
  input: SubmitOrderInput,
  ids: {
    ref: string;
    idempotencyKeyHash: string;
    customerId: string;
    organizationId: string | null;
    categoryId: number;
    productId: number | null;
  },
): InsertOrderValues {
  const qty = toInt(input.qty);
  const org = isOrg(input);

  return {
    ref: ids.ref,
    idempotencyKeyHash: ids.idempotencyKeyHash,
    customerId: ids.customerId,
    organizationId: ids.organizationId,
    customerType: input.ctype,
    categoryId: ids.categoryId,
    productId: ids.productId,
    quantity: input.cat === "custom" ? null : qty > 0 ? qty : null,
    color: input.cat === "wear" ? nullIfEmpty(input.color) : null,
    phoneModel: input.cat === "phone" ? nullIfEmpty(input.model) : null,
    width: input.cat === "sticker" && toDecimal(input.w) > 0 ? String(toDecimal(input.w)) : null,
    height: input.cat === "sticker" && toDecimal(input.h) > 0 ? String(toDecimal(input.h)) : null,
    unit: input.cat === "sticker" ? nullIfEmpty(input.unit) : null,
    shape: input.cat === "sticker" ? nullIfEmpty(input.shape) : null,
    customText: input.cat === "mug" || input.cat === "phone" ? nullIfEmpty(input.text) : null,
    description: input.cat === "custom" ? nullIfEmpty(input.desc) : null,
    notes: nullIfEmpty(input.notes) ?? nullIfEmpty(input.use),
    needsDesignHelp: input.help,
    designNotes: nullIfEmpty(input.artNotes),
    wantsSample: org ? input.sample : false,
    perPieceNames: org ? input.perPiece : false,
    batchedDelivery: org ? input.batches : false,
    batchNotes: org && input.batches ? nullIfEmpty(input.batchNotes) : null,
    needsInvoice: org ? input.invoice : false,
    receiptMethod: input.receipt,
    deliveryAddress: input.receipt === "delivery" ? nullIfEmpty(input.address) : null,
    desiredDate: nullIfEmpty(input.date),
  };
}

/**
 * Persists a customer request as status `submitted` (brief B5).
 * Idempotent on `submissionKey` (stored hashed). Claims matching `upload_drafts` into `order_files`.
 */
export async function submitOrder(input: SubmitOrderInput): Promise<Result<SubmitOrderResult>> {
  const phone = normalizeEgyptianMobile(input.phone);
  if (!phone) {
    return err(new ValidationError({ phone: ["رقم الموبايل مش صحيح."] }));
  }

  const idempotencyKeyHash = await hashToken(input.submissionKey, env.TOKEN_HASH_SECRET);

  const existing = await findOrderRefByIdempotencyHash(idempotencyKeyHash);
  if (existing) return ok({ ref: existing });

  const categoryId = await findCategoryIdByKey(input.cat);
  if (categoryId === null) {
    return err(new ValidationError({ cat: ["التصنيف مش موجود."] }, "التصنيف مش موجود."));
  }

  let productId: number | null = null;
  if (input.prod) {
    productId = await findProductIdByKey(input.prod);
    if (productId === null) {
      return err(new ValidationError({ prod: ["المنتج مش موجود."] }, "المنتج مش موجود."));
    }
  }

  const drafts = await listLiveDrafts(idempotencyKeyHash);
  const hasDesign = drafts.some((d) => d.kind === "design" || d.kind === "reference");
  const hasSheet = drafts.some((d) => d.kind === "names_sheet");

  if (!hasDesign && !input.help) {
    return err(
      new ValidationError(
        { help: ["ارفع ملف تصميم أو فعّل مساعدة التصميم."] },
        "ارفع ملف تصميم أو فعّل «محتاج مساعدة في التصميم».",
      ),
    );
  }
  if (isOrg(input) && input.perPiece && !hasSheet) {
    return err(
      new ValidationError(
        { hasNamesSheet: ["شيت الأسماء مطلوب."] },
        "ارفع شيت الأسماء (Excel أو CSV أو PDF).",
      ),
    );
  }

  // Client flags must not contradict the drafts we will claim (anti-spoof).
  if (input.hasDesignFiles && !hasDesign) {
    return err(
      new ValidationError(
        { hasDesignFiles: ["الملفات لسه مش متأكدين منها."] },
        "الملفات لسه بترفع أو خلصتش. استنى شوية وجرّب تاني.",
      ),
    );
  }
  if (input.hasNamesSheet && !hasSheet) {
    return err(
      new ValidationError(
        { hasNamesSheet: ["شيت الأسماء لسه مش متأكد منه."] },
        "شيت الأسماء لسه بيرفع. استنى شوية وجرّب تاني.",
      ),
    );
  }

  try {
    const result = await withTransaction(async (tx) => {
      // Re-check inside the transaction for concurrent first submits.
      const raced = await findOrderRefByIdempotencyHash(idempotencyKeyHash, tx);
      if (raced) return { ref: raced };

      const customerId = await upsertCustomerByPhone(
        {
          name: input.name.trim(),
          phone,
          email: nullIfEmpty(input.email ?? ""),
        },
        tx,
      );

      let organizationId: string | null = null;
      if (isOrg(input)) {
        organizationId = await createOrganization(
          {
            name: input.org.trim(),
            type: input.ctype === "group" ? "group" : "biz",
            taxId: input.invoice ? nullIfEmpty(input.taxId) : null,
          },
          tx,
        );
        await linkOrganizationContact(
          {
            organizationId,
            customerId,
            title: nullIfEmpty(input.role),
          },
          tx,
        );
      }

      let order: { id: string; ref: string } | null = null;
      for (let i = 0; i < REF_ATTEMPTS; i++) {
        const ref = generateOrderRef();
        // ON CONFLICT DO NOTHING keeps the tx usable when a concurrent submit wins
        // the idempotency unique index (or a rare ref collision). Do not catch 23505
        // and continue querying in the same transaction — Postgres would be aborted.
        const inserted = await insertSubmittedOrder(
          buildOrderValues(input, {
            ref,
            idempotencyKeyHash,
            customerId,
            organizationId,
            categoryId,
            productId,
          }),
          tx,
        );
        if (inserted) {
          order = inserted;
          break;
        }
        const again = await findOrderRefByIdempotencyHash(idempotencyKeyHash, tx);
        if (again) return { ref: again };
        // else: ref collision — retry with a new ref
      }
      if (!order) {
        throw new ConflictError("order ref collision", "ما قدرناش نعمل رقم الطلب. جرّب تاني.");
      }

      if (hasSizeSplit({ cat: input.cat, prod: input.prod })) {
        const sizes = WEAR_SIZES.map((size) => ({
          size,
          qty: toInt(input.sizes[size]),
        })).filter((s) => s.qty > 0);
        await insertOrderSizes(order.id, sizes, tx);
      }
      if (input.cat === "wear" && input.places.length) {
        await insertOrderPlaces(order.id, input.places, tx);
      }

      const liveDrafts = await listLiveDrafts(idempotencyKeyHash, tx);
      await claimDraftsToOrder(order.id, liveDrafts, tx);

      await insertSubmittedEvent(order.id, tx);
      await logActivity(tx, {
        userId: null,
        action: "orders.submitted",
        entityType: "order",
        entityId: order.id,
        orderId: order.id,
        meta: {
          customerType: input.ctype,
          category: input.cat,
          // Never log the phone; mask is unnecessary when omitted.
          submittedAt: cairoDateString(new Date()),
          fileCount: liveDrafts.length,
        },
      });

      return { ref: order.ref };
    });

    return ok(result);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const ref = await findOrderRefByIdempotencyHash(idempotencyKeyHash);
      if (ref) return ok({ ref });
    }
    throw error;
  }
}
