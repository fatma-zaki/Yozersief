/**
 * The desk workspace (brief B10, docs/design/Team-Desk.html). Pure: which orders are the desk's,
 * where each one stands, and how a quote draft reads. The desk prepares and forwards; the final
 * decision and prices stay with the admin (brief B9).
 */
import { formatMoney } from "@/lib/format";
import type { AdminStatus } from "./admin-view";

/** Internal timeline events the desk writes (never shown on tracking). */
export const DESK_EVENTS = {
  forwarded: "forwarded_to_admin",
  quoteDrafted: "quote_drafted",
} as const;

/**
 * The design's badges: «جديد», «بانتظار العميل», «بانتظار المدير»; plus the mockup hand-off
 * between the designer and the customer (B3 step 5): «موكاب جاهز», «الموكاب لدى العميل».
 */
export type DeskState = "new" | "awaiting" | "pending" | "mockup" | "mockup_sent";

/** A business order at the mockup stage is the desk's while a version waits on it or the customer. */
export function deskMockupState(latest: string | null): DeskState | null {
  if (latest === "with_desk") return "mockup";
  if (latest === "sent") return "mockup_sent";
  return null;
}

/** Events that hand the order to the admin, or take it back to the desk. */
const HANDED_OVER: readonly string[] = [DESK_EVENTS.forwarded, DESK_EVENTS.quoteDrafted];
const BACK_TO_DESK: readonly string[] = ["customer_responded", "info_requested"];

/**
 * Where an undecided order stands for the desk, from its status and its event types (oldest
 * first). Decided orders (approved, rejected) are not the desk's and return null.
 */
export function deskState(status: AdminStatus, eventTypes: readonly string[]): DeskState | null {
  if (status === "awaiting") return "awaiting";
  if (status !== "new" && status !== "review") return null;
  const last = eventTypes.findLast((t) => HANDED_OVER.includes(t) || BACK_TO_DESK.includes(t));
  return last && HANDED_OVER.includes(last) ? "pending" : "new";
}

export type QuoteDraft = { unitPrice: string; total: string; leadTimeDays: number };

/** One line the admin sends as the official quote: "سعر القطعة: 85 ج.م · …". */
export function quoteSummary(q: QuoteDraft): string {
  return [
    `سعر القطعة: ${formatMoney(q.unitPrice)}`,
    `الإجمالي: ${formatMoney(q.total)}`,
    `مدة التنفيذ: ${daysLabel(q.leadTimeDays)}`,
  ].join(" · ");
}

/** "يوم واحد", "يومان", "5 أيام", "14 يومًا". */
export function daysLabel(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  return `${n} ${n <= 10 ? "أيام" : "يومًا"}`;
}

/** «متوسط أول رد»: mean minutes from submission to the first staff action, or null. */
export function averageFirstResponseMinutes(
  pairs: readonly { submittedAt: Date; firstActionAt: Date }[],
): number | null {
  if (!pairs.length) return null;
  const total = pairs.reduce(
    (sum, p) => sum + Math.max(0, p.firstActionAt.getTime() - p.submittedAt.getTime()),
    0,
  );
  return Math.round(total / pairs.length / 60_000);
}

/** "25 د", "3 س", "1 س 20 د", "2 يوم". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} د`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} س ${m} د` : `${h} س`;
  }
  return `${Math.round(minutes / (24 * 60))} يوم`;
}
