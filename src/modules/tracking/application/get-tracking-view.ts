import "server-only";
import { AppError, NotFoundError } from "@/lib/errors";
import { normalizeOrderRef } from "@/lib/ids";
import { err, ok, type Result } from "@/lib/result";
import { ar } from "@/i18n/ar";
import { toCustomerTrackingDto, type CustomerTrackingDto } from "../domain/customer-view";
import {
  loadCustomerVisibleEvents,
  loadOrderForCustomerView,
} from "../infrastructure/tracking-repository";

/**
 * Loads the customer-safe tracking DTO for the order bound to a validated session.
 * `expectedRef` is required: missing, invalid, or mismatched refs are rejected so
 * callers cannot skip session↔URL binding.
 */
export async function getCustomerTrackingView(
  sessionOrderId: string,
  expectedRef: string,
): Promise<Result<CustomerTrackingDto>> {
  try {
    const canonicalRef = normalizeOrderRef(expectedRef);
    if (!canonicalRef) {
      return err(
        new AppError(
          "unauthorized",
          401,
          ar.tracking.unauthorized,
          "tracking expectedRef missing or invalid",
        ),
      );
    }

    const order = await loadOrderForCustomerView(sessionOrderId);
    if (!order) {
      return err(new NotFoundError("order missing for tracking session", ar.tracking.loadError));
    }
    if (order.ref !== canonicalRef) {
      return err(
        new AppError(
          "unauthorized",
          401,
          ar.tracking.unauthorized,
          "tracking session order does not match url ref",
        ),
      );
    }

    const events = await loadCustomerVisibleEvents(order.id);
    return ok(toCustomerTrackingDto(order, events));
  } catch (cause) {
    return err(
      new AppError("internal", 500, ar.tracking.loadError, "getCustomerTrackingView failed", {
        cause,
      }),
    );
  }
}
