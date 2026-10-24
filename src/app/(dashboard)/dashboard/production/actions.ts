"use server";

import { revalidatePath } from "next/cache";
import { actionError, fromResult, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import {
  finishPrinting,
  passQc,
  setPieceDone,
  setPrintedCount,
  setQcCheck,
  startPrinting,
} from "@/modules/orders";
import type {
  DeskOrderInput,
  PiecePrintedInput,
  PrintedCountInput,
  QcCheckInput,
} from "@/modules/orders/schemas";

type Step = "start" | "finish" | "pass";
const STEPS = { start: startPrinting, finish: finishPrinting, pass: passQc } as const;

/** Production → «ابدأ الطباعة» / «انتهى — إلى الفحص» / «الفحص سليم». */
export async function productionStepAction(
  step: Step,
  input: DeskOrderInput,
): Promise<ActionResult<{ ref: string }>> {
  try {
    const staff = await requirePermission("production.update");
    const run = STEPS[step];
    if (!run) throw new Error(`unknown production step ${String(step)}`);
    const result = await run(staff, input);
    if (result.ok) revalidatePath("/dashboard/production");
    return fromResult(result);
  } catch (error) {
    return actionError(error);
  }
}

/** Production → the press counter (− / + / +10). */
export async function printedCountAction(
  input: PrintedCountInput,
): Promise<ActionResult<{ printed: number }>> {
  try {
    const staff = await requirePermission("production.update");
    return fromResult(await setPrintedCount(staff, input));
  } catch (error) {
    return actionError(error);
  }
}

/** Production → one QC checklist item. */
export async function qcCheckAction(input: QcCheckInput): Promise<ActionResult<{ on: boolean }>> {
  try {
    const staff = await requirePermission("production.update");
    return fromResult(await setQcCheck(staff, input));
  } catch (error) {
    return actionError(error);
  }
}

/** Production → «جدول الأسماء» tick. */
export async function piecePrintedAction(
  input: PiecePrintedInput,
): Promise<ActionResult<{ printed: boolean }>> {
  try {
    const staff = await requirePermission("production.update");
    return fromResult(await setPieceDone(staff, input));
  } catch (error) {
    return actionError(error);
  }
}
