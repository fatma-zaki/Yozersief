import {
  countOrdersCreatedBetween,
  countOrdersWithEventBetween,
} from "../infrastructure/admin-repository";

/**
 * The order end of the traffic funnel (brief B12): orders sent and orders approved in a window.
 * Counts only, no order data; the caller checks `traffic.view`.
 */
export async function countOrderFunnel(window: { from: Date; to: Date }) {
  const [submitted, approved] = await Promise.all([
    countOrdersCreatedBetween(window.from, window.to),
    countOrdersWithEventBetween(["approved", "quote_sent"], window.from, window.to),
  ]);
  return { submitted, approved };
}
