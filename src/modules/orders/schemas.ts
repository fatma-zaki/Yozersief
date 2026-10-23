/**
 * Zod inputs for the public order module. Shared by the Request Builder client and the
 * submit server action (brief A2, A5). Server validation is authoritative.
 */
import { z } from "zod";
import { CATEGORY_KEYS, WEAR_SIZES } from "@/modules/catalog/schemas";
import { cairoDateString, normalizeDigits } from "@/lib/format";
import { normalizeEgyptianMobile } from "@/lib/phone";
import {
  COLORS,
  MUG_PRODUCTS,
  PRINT_PLACES,
  STICKER_SHAPES,
  WEAR_PRODUCTS,
  hasSizeSplit,
  isOrg,
  sizeSum,
  toDecimal,
  toInt,
  type RequestDraft,
  type WearSize,
} from "./domain/request";

const wearProduct = z.enum(WEAR_PRODUCTS);
const mugProduct = z.enum(MUG_PRODUCTS);
const productKey = z.union([wearProduct, mugProduct]);

const emptyWearSizeStrings = (): Record<WearSize, string> =>
  Object.fromEntries(WEAR_SIZES.map((s) => [s, ""])) as Record<WearSize, string>;

const wearSizesInputSchema = z.object(
  Object.fromEntries(WEAR_SIZES.map((s) => [s, z.string()])) as Record<WearSize, z.ZodString>,
);

/** Client submission key: owns draft uploads and doubles as the durable idempotency key. */
export const submissionKeySchema = z.string().uuid();

/**
 * Raw payload from the Request Builder (string fields match the draft). Refined for B4/B5.
 * Files are not in this payload — they are claimed from `upload_drafts` via `submissionKey`.
 */
export const submitOrderInputSchema = z
  .object({
    submissionKey: submissionKeySchema,
    ctype: z.enum(["person", "biz", "group"]),
    cat: z.enum(CATEGORY_KEYS),
    prod: z.union([productKey, z.literal("")]).default(""),
    color: z.union([z.enum(COLORS), z.literal("")]).default(""),
    qty: z.string().default(""),
    sizes: wearSizesInputSchema.default(emptyWearSizeStrings()),
    places: z.array(z.enum(PRINT_PLACES)).default([]),
    text: z.string().default(""),
    model: z.string().default(""),
    w: z.string().default(""),
    h: z.string().default(""),
    unit: z.union([z.enum(["cm", "mm"]), z.literal("")]).default(""),
    shape: z.union([z.enum(STICKER_SHAPES), z.literal("")]).default(""),
    use: z.string().default(""),
    desc: z.string().default(""),
    notes: z.string().default(""),
    sample: z.boolean().default(false),
    perPiece: z.boolean().default(false),
    batches: z.boolean().default(false),
    batchNotes: z.string().default(""),
    help: z.boolean().default(false),
    artNotes: z.string().default(""),
    /** True when at least one design/reference draft was uploaded under this submission key. */
    hasDesignFiles: z.boolean().default(false),
    /** True when a names-sheet draft was uploaded (required when perPiece). */
    hasNamesSheet: z.boolean().default(false),
    org: z.string().default(""),
    role: z.string().default(""),
    invoice: z.boolean().default(false),
    taxId: z.string().default(""),
    name: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    date: z.string().default(""),
    receipt: z.enum(["pickup", "delivery"]),
    address: z.string().default(""),
  })
  .superRefine((d, ctx) => {
    const today = cairoDateString(new Date());
    const org = isOrg(d);
    const qty = toInt(d.qty);

    if (d.ctype === "person") {
      if (d.sample || d.perPiece || d.batches || d.invoice) {
        ctx.addIssue({
          code: "custom",
          path: ["ctype"],
          message: "خيارات الجملة للشركات والجهات بس.",
        });
      }
    }

    if (d.cat === "wear") {
      if (!d.prod || !wearProduct.safeParse(d.prod).success) {
        ctx.addIssue({ code: "custom", path: ["prod"], message: "اختار نوع المنتج." });
      }
      if (!d.color) {
        ctx.addIssue({ code: "custom", path: ["color"], message: "اختار اللون." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
      if (hasSizeSplit({ cat: d.cat, prod: d.prod }) && qty > 0 && sizeSum(d.sizes) !== qty) {
        ctx.addIssue({
          code: "custom",
          path: ["sizes"],
          message: "مجموع المقاسات لازم يساوي الكمية.",
        });
      }
      if (d.places.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["places"],
          message: "اختار مكان طباعة واحد على الأقل.",
        });
      }
    } else if (d.cat === "mug") {
      if (!d.prod || !mugProduct.safeParse(d.prod).success) {
        ctx.addIssue({ code: "custom", path: ["prod"], message: "اختار المنتج." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
    } else if (d.cat === "phone") {
      if (d.model.trim().length < 1) {
        ctx.addIssue({ code: "custom", path: ["model"], message: "اكتب موديل الموبايل." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
    } else if (d.cat === "sticker") {
      const w = toDecimal(d.w);
      const h = toDecimal(d.h);
      if (!(w > 0 && h > 0 && d.unit)) {
        ctx.addIssue({ code: "custom", path: ["w"], message: "اكتب الأبعاد ووحدة القياس." });
      }
      if (!d.shape) {
        ctx.addIssue({ code: "custom", path: ["shape"], message: "اختار الشكل." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
    } else if (d.cat === "custom") {
      if (d.desc.trim().length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["desc"],
          message: "وصف الفكرة لازم يكون 10 حروف على الأقل.",
        });
      }
    }

    if (org && d.batches && d.batchNotes.trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["batchNotes"],
        message: "اكتب ملاحظات التسليم على دفعات (5 حروف على الأقل).",
      });
    }

    if (!d.hasDesignFiles && !d.help) {
      ctx.addIssue({
        code: "custom",
        path: ["help"],
        message: "ارفع ملف تصميم أو فعّل «محتاج مساعدة في التصميم».",
      });
    }
    if (org && d.perPiece && !d.hasNamesSheet) {
      ctx.addIssue({
        code: "custom",
        path: ["hasNamesSheet"],
        message: "ارفع شيت الأسماء (Excel أو CSV أو PDF).",
      });
    }

    if (org && d.org.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["org"], message: "اكتب اسم الجهة أو الشركة." });
    }
    if (d.name.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "اكتب الاسم (حرفين على الأقل)." });
    }
    if (!normalizeEgyptianMobile(d.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "رقم الموبايل لازم يكون مصري ويبدأ بـ 010 أو 011 أو 012 أو 015.",
      });
    }
    if (d.email.trim()) {
      const emailOk = z.string().trim().email().safeParse(d.email).success;
      if (!emailOk) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "الإيميل مش صحيح." });
      }
    }
    if (d.receipt === "delivery" && d.address.trim().length < 5) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "اكتب عنوان التسليم." });
    }
    if (d.date) {
      const normalized = normalizeDigits(d.date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || normalized < today) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: "التاريخ المرغوب مش يقدر يكون في الماضي.",
        });
      }
    }
  });

export type SubmitOrderInput = z.infer<typeof submitOrderInputSchema>;

/** Map validated submit input into a RequestDraft-shaped object for shared domain helpers. */
export function toRequestDraft(input: SubmitOrderInput): RequestDraft {
  return {
    ctype: input.ctype,
    cat: input.cat,
    prod: input.prod,
    color: input.color,
    qty: input.qty,
    sizes: input.sizes,
    places: input.places,
    text: input.text,
    model: input.model,
    w: input.w,
    h: input.h,
    unit: input.unit,
    shape: input.shape,
    use: input.use,
    desc: input.desc,
    notes: input.notes,
    sample: input.sample,
    perPiece: input.perPiece,
    batches: input.batches,
    batchNotes: input.batchNotes,
    files: [],
    help: input.help,
    artNotes: input.artNotes,
    org: input.org,
    role: input.role,
    invoice: input.invoice,
    taxId: input.taxId,
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    date: input.date,
    receipt: input.receipt,
    address: input.address,
  };
}

/* ---------- Admin orders screen (brief B7) ---------- */

const orderIdSchema = z.string().uuid();

/** «موافقة» / «طلب بيانات من العميل» / «رفض». Text rules per decision live in the lifecycle. */
export const decideOrderSchema = z.object({
  orderId: orderIdSchema,
  decision: z.enum(["approve", "info", "reject"]),
  /** Price & date (individual approve), quote (business approve), what's needed, or the reason. */
  text: z.string().trim().max(2000).default(""),
  /** Prepare the customer's WhatsApp message (always on for info and reject). */
  notify: z.boolean().default(true),
});
export type DecideOrderInput = z.input<typeof decideOrderSchema>;

/** «سجّل المرحلة الجاية» on a business order. */
export const advanceStageSchema = z.object({
  orderId: orderIdSchema,
  notify: z.boolean().default(true),
});
export type AdvanceStageInput = z.input<typeof advanceStageSchema>;

/** «ملاحظة داخلية» — never shown to the customer. */
export const internalNoteSchema = z.object({
  orderId: orderIdSchema,
  note: z.string().trim().max(4000),
});
export type InternalNoteInput = z.input<typeof internalNoteSchema>;
