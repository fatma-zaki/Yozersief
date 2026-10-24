import { logActivity } from "@/modules/audit";
import type { Tx } from "@/db/tx";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertCan, type StaffContext } from "@/lib/rbac";
import type { Result } from "@/lib/result";
import {
  clampCount,
  productionColumn,
  QC_CHECKS,
  type JobStage,
  type ProductionColumn,
  type QcKey,
} from "../domain/workspaces";
import {
  deskOrderSchema,
  piecePrintedSchema,
  printedCountSchema,
  qcCheckSchema,
  type DeskOrderInput,
  type PiecePrintedInput,
  type PrintedCountInput,
  type QcCheckInput,
} from "../schemas";
import { listSizesFor } from "../infrastructure/admin-repository";
import { insertOrderEvent, lockOrder } from "../infrastructure/order-repository";
import {
  findJob,
  listJobsFor,
  listPiecesFor,
  setPiecePrinted,
  upsertJob,
} from "../infrastructure/workspace-repository";
import { baseVars, getAdminOrders, inTransaction, type AdminOrderView } from "./admin-orders";
import { applyTransitionInTx } from "./apply-transition";

export type ProductionCard = {
  id: string;
  ref: string;
  product: string;
  spec: string;
  categoryKey: string;
  productKey: string | null;
  column: ProductionColumn;
  quantity: number;
  printed: number;
  qc: Record<QcKey, boolean>;
  /** Why «ابدأ الطباعة» can't run yet (B3: mockup and deposit first), else null. */
  blocked: string | null;
};

export type NamesSheet = {
  orderId: string;
  ref: string;
  title: string;
  pieces: { id: number; name: string; size: string; printed: boolean }[];
  /** The customer's sheet, when the pieces are not entered yet. */
  sheetUrl: string | null;
};

export type ProductionData = { cards: ProductionCard[]; sheet: NamesSheet | null };

const NO_QC: Record<QcKey, boolean> = {
  qcSizesOk: false,
  qcNamesOk: false,
  qcPrintOk: false,
  qcCountOk: false,
};

/**
 * The production board (docs/design/Team-Production.html): approved orders from «جاهز للطباعة»
 * to «جاهز للتسليم». Specs, quantities and approved files only — no prices, no contacts (B9).
 */
export async function getProductionBoard(actor: StaffContext): Promise<ProductionData> {
  assertCan(actor, "production.update");
  const data = await getAdminOrders(actor);
  const candidates = data.orders.filter((o) =>
    ["approved", "in_production", "ready"].includes(o.orderStatus),
  );
  const jobs = await listJobsFor(candidates.map((o) => o.id));
  const jobBy = new Map(jobs.map((j) => [j.orderId, j]));

  const placed: { o: AdminOrderView; card: ProductionCard }[] = [];
  for (const o of candidates) {
    const job = jobBy.get(o.id);
    const column = productionColumn(
      { status: o.orderStatus, bizStage: o.bizStage, customerType: o.ctype },
      (job?.stage as JobStage | undefined) ?? null,
    );
    if (!column) continue;
    placed.push({
      o,
      card: {
        id: o.id,
        ref: o.ref,
        product: o.product,
        spec: o.specs
          .filter((s) => s.k !== "عنوان التوصيل")
          .map((s) => s.v)
          .join(" · "),
        categoryKey: o.categoryKey,
        productKey: o.productKey,
        column,
        quantity: o.quantity,
        printed: column === "ready" ? o.quantity : Math.min(job?.printedCount ?? 0, o.quantity),
        qc: job
          ? {
              qcSizesOk: job.qcSizesOk,
              qcNamesOk: job.qcNamesOk,
              qcPrintOk: job.qcPrintOk,
              qcCountOk: job.qcCountOk,
            }
          : NO_QC,
        blocked: column === "queue" ? (o.next?.blocked ?? null) : null,
      },
    });
  }

  // «شيت الأسماء»: the first order on the press that prints a name per piece.
  const named = placed.find((p) => p.o.bulk.perPiece && p.card.column === "print");
  let sheet: NamesSheet | null = null;
  if (named) {
    const pieces = await listPiecesFor(named.o.id);
    sheet = {
      orderId: named.o.id,
      ref: named.o.ref,
      title: named.o.org || named.o.name,
      pieces: pieces.map((p) => ({
        id: p.id,
        name: [p.nameText, p.numberText].filter(Boolean).join(" ") || `قطعة ${p.seq}`,
        size: p.size ?? "",
        printed: Boolean(p.printedAt),
      })),
      sheetUrl: named.o.files.find((f) => f.kind === "names_sheet")?.url ?? null,
    };
  }
  return { cards: placed.map((p) => p.card), sheet };
}

type StepResult = Result<{ ref: string }>;

async function lockForProduction(tx: Tx, orderId: string) {
  const order = await lockOrder(orderId, tx);
  if (!order) throw new NotFoundError(`order ${orderId}`);
  return order;
}

/** Pieces to print: the size split's sum, else the order quantity (as the board shows). */
async function pieceCount(tx: Tx, order: { id: string; quantity: number | null }) {
  const sizes = await listSizesFor([order.id], tx);
  return sizes.reduce((sum, s) => sum + s.qty, 0) || order.quantity || 1;
}

/** «ابدأ الطباعة»: start_production (the lifecycle checks mockup and deposit for business). */
export async function startPrinting(actor: StaffContext, raw: DeskOrderInput): Promise<StepResult> {
  assertCan(actor, "production.update");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockForProduction(tx, input.orderId);
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      {
        orderId: order.id,
        transition: "start_production",
        notifyCustomer: true,
        messageVars: {
          ...(await baseVars(tx, order.id, order.customerId)),
          update: "الإنتاج بدأ.",
        },
      },
    );
    if (!applied.ok) throw applied.error;
    return { ref: order.ref };
  });
}

/** The press counter («اتطبع X من Y»), clamped to the order's pieces. */
export async function setPrintedCount(
  actor: StaffContext,
  raw: PrintedCountInput,
): Promise<Result<{ printed: number }>> {
  assertCan(actor, "production.update");
  const input = printedCountSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockForProduction(tx, input.orderId);
    if (order.status !== "in_production") {
      throw new ConflictError("not printing", "الطلب ده مش في الطباعة دلوقتي.");
    }
    const printed = clampCount(input.count, await pieceCount(tx, order));
    await upsertJob(order.id, { printedCount: printed }, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "production.counter_updated",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      meta: { printed },
    });
    return { printed };
  });
}

/**
 * «خلص — للفحص». Business orders run send_to_qc; an individual's order has no QC stage in the
 * lifecycle, so only its job moves (the board and the checklist still apply).
 */
export async function finishPrinting(
  actor: StaffContext,
  raw: DeskOrderInput,
): Promise<StepResult> {
  assertCan(actor, "production.update");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockForProduction(tx, input.orderId);
    const job = await findJob(order.id, tx);
    if ((job?.printedCount ?? 0) < (await pieceCount(tx, order))) {
      throw new ValidationError({}, "لسه في قطع ما اتطبعتش. كمّل العداد الأول.");
    }
    if (order.customerType === "person") {
      if (order.status !== "in_production") {
        throw new ConflictError("not printing", "الطلب ده مش في الطباعة دلوقتي.");
      }
      await upsertJob(order.id, { stage: "qc" }, tx);
      await insertOrderEvent(
        {
          orderId: order.id,
          type: "qc_started",
          titleAr: "فحص الجودة",
          note: null,
          visibleToCustomer: false,
          actorId: actor.id,
        },
        tx,
      );
      await logActivity(tx, {
        userId: actor.id,
        action: "production.qc_started",
        entityType: "order",
        entityId: order.id,
        orderId: order.id,
      });
      return { ref: order.ref };
    }
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      { orderId: order.id, transition: "send_to_qc" },
    );
    if (!applied.ok) throw applied.error;
    return { ref: order.ref };
  });
}

/** One QC checklist item (B3 step 8). */
export async function setQcCheck(
  actor: StaffContext,
  raw: QcCheckInput,
): Promise<Result<{ on: boolean }>> {
  assertCan(actor, "production.update");
  const input = qcCheckSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockForProduction(tx, input.orderId);
    if (order.status !== "in_production") {
      throw new ConflictError("not in qc", "الطلب ده مش في فحص الجودة.");
    }
    await upsertJob(order.id, { [input.key]: input.on }, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "production.qc_checked",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      meta: { key: input.key, on: input.on },
    });
    return { on: input.on };
  });
}

/** «الفحص تمام»: mark_ready — the delivery person and the customer are told. */
export async function passQc(actor: StaffContext, raw: DeskOrderInput): Promise<StepResult> {
  assertCan(actor, "production.update");
  const input = deskOrderSchema.parse(raw);
  return inTransaction(async (tx) => {
    const order = await lockForProduction(tx, input.orderId);
    const job = await findJob(order.id, tx);
    if (!job || !QC_CHECKS.every(([key]) => job[key])) {
      throw new ValidationError({}, "لازم كل بنود فحص الجودة تبقى تمام.");
    }
    const applied = await applyTransitionInTx(
      tx,
      { kind: "staff", staff: actor },
      {
        orderId: order.id,
        transition: "mark_ready",
        notifyCustomer: true,
        messageVars: await baseVars(tx, order.id, order.customerId),
      },
    );
    if (!applied.ok) throw applied.error;
    return { ref: order.ref };
  });
}

/** «شيت الأسماء»: tick a piece once it's printed. */
export async function setPieceDone(
  actor: StaffContext,
  raw: PiecePrintedInput,
): Promise<Result<{ printed: boolean }>> {
  assertCan(actor, "production.update");
  const input = piecePrintedSchema.parse(raw);
  return inTransaction(async (tx) => {
    const piece = await setPiecePrinted(input.pieceId, input.printed, tx);
    if (!piece) throw new NotFoundError(`piece ${input.pieceId}`);
    await logActivity(tx, {
      userId: actor.id,
      action: "production.piece_printed",
      entityType: "order_piece",
      entityId: String(input.pieceId),
      orderId: piece.orderId,
      meta: { printed: input.printed },
    });
    return { printed: input.printed };
  });
}
