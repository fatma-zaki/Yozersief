import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrackingSessionMessage } from "./TrackingSessionMessage";

describe("tracking UI states", () => {
  it("renders the expired-session / unauthorized message with a return link", () => {
    const html = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: "انتهت جلسة التتبّع. اكتب رقم الطلب ورقم الموبايل تاني.",
        body: "محتاج تتأكد من الطلب الأول عشان تشوف التفاصيل.",
      }),
    );
    expect(html).toContain("انتهت جلسة التتبّع");
    expect(html).toContain('href="/track"');
  });

  it("renders a generic error state", () => {
    const html = renderToStaticMarkup(
      createElement(TrackingSessionMessage, {
        title: "مش قادرين نجيب حالة الطلب دلوقتي. جرّب تاني بعد شوية.",
        body: "حصلت مشكلة عندنا.",
      }),
    );
    expect(html).toContain("مش قادرين نجيب حالة الطلب");
  });
});
