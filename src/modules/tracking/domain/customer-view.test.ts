import { describe, expect, it } from "vitest";
import {
  CUSTOMER_DTO_PROHIBITED_KEYS,
  customerDtoHasProhibitedFields,
  toCustomerTrackingDto,
  type EventRowForCustomerView,
  type OrderRowForCustomerView,
} from "./customer-view";

const baseOrder = (overrides: Partial<OrderRowForCustomerView> = {}): OrderRowForCustomerView => ({
  id: "11111111-1111-4111-8111-111111111111",
  ref: "YZ-AB23CD",
  status: "submitted",
  bizStage: null,
  customerType: "person",
  createdAt: new Date("2026-10-20T10:00:00.000Z"),
  desiredDate: "2026-11-01",
  receiptMethod: "pickup",
  rejectionReason: "سبب داخلي مش للعميل إلا عند الرفض",
  ...overrides,
});

describe("toCustomerTrackingDto", () => {
  it("excludes prohibited fields and never copies phone/internal keys", () => {
    const dto = toCustomerTrackingDto(baseOrder(), []);
    expect(customerDtoHasProhibitedFields(dto)).toBe(false);
    for (const key of CUSTOMER_DTO_PROHIBITED_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(JSON.stringify(dto)).not.toMatch(/010\d{8}/);
    expect(JSON.stringify(dto)).not.toMatch(/internal/i);
  });

  it("returns only customer-visible events", () => {
    const events: EventRowForCustomerView[] = [
      {
        id: 1,
        titleAr: "ظاهر",
        note: "للعميل",
        createdAt: new Date("2026-10-21T10:00:00.000Z"),
        visibleToCustomer: true,
      },
      {
        id: 2,
        titleAr: "داخلي",
        note: "staff only",
        createdAt: new Date("2026-10-21T11:00:00.000Z"),
        visibleToCustomer: false,
      },
    ];
    const dto = toCustomerTrackingDto(baseOrder(), events);
    expect(dto.events).toHaveLength(1);
    expect(dto.events[0]?.titleAr).toBe("ظاهر");
    expect(dto.events.some((e) => e.titleAr === "داخلي")).toBe(false);
  });

  it("exposes rejectionReason only when status is rejected", () => {
    const hidden = toCustomerTrackingDto(baseOrder({ status: "submitted" }), []);
    expect(hidden.rejectionReason).toBeNull();

    const shown = toCustomerTrackingDto(
      baseOrder({ status: "rejected", rejectionReason: "الملف ضعيف" }),
      [],
    );
    expect(shown.rejectionReason).toBe("الملف ضعيف");
  });

  it("maps person rail index from status without inventing transitions", () => {
    expect(toCustomerTrackingDto(baseOrder({ status: "submitted" }), []).railIndex).toBe(0);
    expect(toCustomerTrackingDto(baseOrder({ status: "in_review" }), []).railIndex).toBe(1);
    expect(toCustomerTrackingDto(baseOrder({ status: "approved" }), []).railIndex).toBe(2);
    expect(toCustomerTrackingDto(baseOrder({ status: "in_production" }), []).railIndex).toBe(3);
    expect(toCustomerTrackingDto(baseOrder({ status: "ready" }), []).railIndex).toBe(4);
  });
});
