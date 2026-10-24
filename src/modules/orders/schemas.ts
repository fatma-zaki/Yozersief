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
  PRINT_PLACES,
  STICKER_SHAPES,
  hasSizeSplit,
  isOrg,
  sizeSum,
  toDecimal,
  toInt,
  type RequestDraft,
  type WearSize,
} from "./domain/request";

/**
 * A catalog product key (B4 keys such as `tshirt`, or ones added from the dashboard). Whether it
 * exists, is visible and belongs to the chosen category is checked against the catalog on submit.
 */
const productKey = z
  .string()
  .trim()
  .max(60)
  .regex(/^[a-z0-9-]*$/, "المنتج غير موجود.");

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
    prod: productKey.default(""),
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
          message: "خيارات الجملة للشركات والجهات فقط.",
        });
      }
    }

    if (d.cat === "wear") {
      if (!d.prod) {
        ctx.addIssue({ code: "custom", path: ["prod"], message: "اختر نوع المنتج." });
      }
      if (!d.color) {
        ctx.addIssue({ code: "custom", path: ["color"], message: "اختر اللون." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
      if (hasSizeSplit({ cat: d.cat, prod: d.prod }) && qty > 0 && sizeSum(d.sizes) !== qty) {
        ctx.addIssue({
          code: "custom",
          path: ["sizes"],
          message: "يجب أن يساوي مجموع المقاسات الكمية.",
        });
      }
      if (d.places.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["places"],
          message: "اختر مكان طباعة واحد على الأقل.",
        });
      }
    } else if (d.cat === "mug") {
      if (!d.prod) {
        ctx.addIssue({ code: "custom", path: ["prod"], message: "اختر المنتج." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
    } else if (d.cat === "phone") {
      if (d.model.trim().length < 1) {
        ctx.addIssue({ code: "custom", path: ["model"], message: "اكتب طراز الهاتف." });
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
        ctx.addIssue({ code: "custom", path: ["shape"], message: "اختر الشكل." });
      }
      if (qty < 1) {
        ctx.addIssue({ code: "custom", path: ["qty"], message: "اكتب الكمية." });
      }
    } else if (d.cat === "custom") {
      if (d.desc.trim().length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["desc"],
          message: "يجب أن يتكون وصف الفكرة من 10 أحرف على الأقل.",
        });
      }
    }

    if (org && d.batches && d.batchNotes.trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["batchNotes"],
        message: "اكتب ملاحظات التسليم على دفعات (5 أحرف على الأقل).",
      });
    }

    if (!d.hasDesignFiles && !d.help) {
      ctx.addIssue({
        code: "custom",
        path: ["help"],
        message: "ارفع ملف تصميم أو فعّل «أحتاج إلى مساعدة في التصميم».",
      });
    }
    if (org && d.perPiece && !d.hasNamesSheet) {
      ctx.addIssue({
        code: "custom",
        path: ["hasNamesSheet"],
        message: "ارفع جدول الأسماء (Excel أو CSV أو PDF).",
      });
    }

    if (org && d.org.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["org"], message: "اكتب اسم الجهة أو الشركة." });
    }
    if (d.name.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "اكتب الاسم (حرفان على الأقل)." });
    }
    if (!normalizeEgyptianMobile(d.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "يجب أن يكون رقم الهاتف مصريًا ويبدأ بـ 010 أو 011 أو 012 أو 015.",
      });
    }
    if (d.email.trim()) {
      const emailOk = z.string().trim().email().safeParse(d.email).success;
      if (!emailOk) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "البريد الإلكتروني غير صحيح." });
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
          message: "لا يمكن أن يكون التاريخ المرغوب في الماضي.",
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

/** «إلغاء الطلب»: the reason shows on the customer's timeline. */
export const cancelOrderSchema = z.object({
  orderId: orderIdSchema,
  reason: z.string().trim().min(5, "اكتب سببًا واضحًا (5 أحرف على الأقل).").max(2000),
});
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;

/** «سجّل المرحلة التالية»: the next step after approval. */
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

/** Options the «تعديل الطلب» form offers; the same lists the Request Builder uses. */
export { COLORS, hasSizeSplit, PRINT_PLACES, STICKER_SHAPES, WEAR_SIZES };

/** A string from a fixed list; typed as plain string so the form can hold stored values as-is. */
const oneOf = (values: readonly string[], message: string) =>
  z.string().refine((v) => values.includes(v), message);

const optionalCount = (message: string) =>
  z
    .string()
    .transform((v) => normalizeDigits(v).trim())
    .pipe(z.string().regex(/^\d{0,6}$/, message));

/**
 * «تعديل الطلب»: the order's details as the admin corrects them. Every field arrives (hidden ones
 * with their current value); the use case writes only what changed and logs it (brief A6.3).
 */
export const editOrderSchema = z
  .object({
    orderId: orderIdSchema,
    qty: optionalCount("يجب أن تكون الكمية رقمًا صحيحًا."),
    sizes: z.object(
      Object.fromEntries(
        WEAR_SIZES.map((s) => [s, optionalCount("يجب أن يكون المقاس رقمًا صحيحًا.")]),
      ) as Record<WearSize, ReturnType<typeof optionalCount>>,
    ),
    places: z.array(oneOf(PRINT_PLACES, "مكان الطباعة غير موجود.")).max(PRINT_PLACES.length),
    color: oneOf(["", ...COLORS], "اللون غير موجود."),
    model: z.string().trim().max(120),
    w: z.string().transform((v) => normalizeDigits(v).trim()),
    h: z.string().transform((v) => normalizeDigits(v).trim()),
    unit: oneOf(["", "cm", "mm"], "وحدة القياس غير موجودة."),
    shape: oneOf(["", ...STICKER_SHAPES], "الشكل غير موجود."),
    text: z.string().trim().max(500),
    desc: z.string().trim().max(4000),
    notes: z.string().trim().max(4000),
    artNotes: z.string().trim().max(4000),
    receipt: z.enum(["pickup", "delivery"]),
    address: z.string().trim().max(500),
    date: z.string().transform((v) => normalizeDigits(v).trim()),
  })
  .superRefine((d, ctx) => {
    if (d.qty && Number(d.qty) < 1) {
      ctx.addIssue({ code: "custom", path: ["qty"], message: "الكمية قطعة واحدة على الأقل." });
    }
    for (const key of ["w", "h"] as const) {
      if (d[key] && !(/^\d{1,6}(\.\d{1,2})?$/.test(d[key]) && toDecimal(d[key]) > 0)) {
        ctx.addIssue({ code: "custom", path: [key], message: "اكتب الأبعاد أرقامًا أكبر من صفر." });
      }
    }
    if (d.receipt === "delivery" && d.address.length < 5) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "اكتب عنوان التسليم." });
    }
    if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "التاريخ غير صحيح." });
    }
  });
export type EditOrderInput = z.input<typeof editOrderSchema>;
export type EditOrderValues = z.output<typeof editOrderSchema>;

/* ---------- Desk workspace (brief B10) ---------- */

/** An amount as typed: Arabic digits and thousands commas allowed, up to 2 decimals. */
const moneyInput = (empty: string) =>
  z
    .string()
    .transform((v) =>
      normalizeDigits(v)
        .replace(/[,٬\s]/g, "")
        .replace("٫", "."),
    )
    .pipe(
      z
        .string()
        .min(1, empty)
        .regex(/^\d{1,10}(\.\d{1,2})?$/, "اكتب رقمًا صحيحًا (مثلًا 85 أو 85.50).")
        .transform((v) => (v.includes(".") ? v : `${v}.00`)),
    );

/** «مسودة عرض السعر» → goes to the admin for approval. */
export const deskQuoteSchema = z.object({
  orderId: orderIdSchema,
  unitPrice: moneyInput("اكتب سعر القطعة."),
  total: moneyInput("اكتب الإجمالي."),
  leadTimeDays: z
    .string()
    .transform((v) => normalizeDigits(v).replace(/[^\d]/g, ""))
    .pipe(
      z
        .string()
        .min(1, "اكتب مدة التنفيذ بالأيام.")
        .transform(Number)
        .pipe(z.number().int().min(1, "المدة يوم واحد على الأقل.").max(365, "المدة طويلة جدًا.")),
    ),
});
export type DeskQuoteInput = z.input<typeof deskQuoteSchema>;

/** «حوّل إلى المدير للموافقة» / «واتساب العميل». */
export const deskOrderSchema = z.object({ orderId: orderIdSchema });
export type DeskOrderInput = z.input<typeof deskOrderSchema>;

/* ---------- Design, production and delivery workspaces (brief B10) ---------- */

/** «ارفع نسخة موكاب جديدة»: the Blob the browser just uploaded for this order. */
export const mockupUploadSchema = z.object({
  orderId: orderIdSchema,
  url: z.url(),
  pathname: z.string().min(1).max(500),
  contentType: z.string().min(1).max(200),
  requestedPathname: z.string().min(1).max(500),
});
export type MockupUploadInput = z.input<typeof mockupUploadSchema>;

/** «أبلغ الاستقبال بمشكلة في الملف». */
export const flagFileSchema = z.object({
  orderId: orderIdSchema,
  note: z.string().trim().max(500).default(""),
});
export type FlagFileInput = z.input<typeof flagFileSchema>;

/** The desk records the customer's answer on the mockup they were sent. */
export const mockupDecisionSchema = z.object({
  orderId: orderIdSchema,
  decision: z.enum(["approve", "changes"]),
  feedback: z.string().trim().max(2000).default(""),
});
export type MockupDecisionInput = z.input<typeof mockupDecisionSchema>;

export const printedCountSchema = z.object({
  orderId: orderIdSchema,
  count: z.number().int().min(0).max(1_000_000),
});
export type PrintedCountInput = z.input<typeof printedCountSchema>;

export const qcCheckSchema = z.object({
  orderId: orderIdSchema,
  key: z.enum(["qcSizesOk", "qcNamesOk", "qcPrintOk", "qcCountOk"]),
  on: z.boolean(),
});
export type QcCheckInput = z.input<typeof qcCheckSchema>;

export const piecePrintedSchema = z.object({
  pieceId: z.number().int().positive(),
  printed: z.boolean(),
});
export type PiecePrintedInput = z.input<typeof piecePrintedSchema>;

/** «آخر 3 أرقام من هاتف العميل». */
export const handoverSchema = z.object({
  orderId: orderIdSchema,
  code: z
    .string()
    .transform((v) => normalizeDigits(v).replace(/\D/g, ""))
    .pipe(z.string().length(3, "اكتب آخر 3 أرقام من هاتف العميل.")),
});
export type HandoverInput = z.input<typeof handoverSchema>;

/** «سجّل الدفعة» — waits for the admin's confirmation. */
export const recordPaymentSchema = z.object({
  orderId: orderIdSchema,
  amount: moneyInput("اكتب المبلغ أولًا."),
  method: z.enum(["cash", "transfer"]),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
