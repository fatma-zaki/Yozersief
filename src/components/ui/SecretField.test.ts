import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SecretField } from "@/components/ui/SecretField";

describe("SecretField", () => {
  it("masks the value by default (password type)", () => {
    const html = renderToStaticMarkup(
      createElement(SecretField, {
        id: "track-ref",
        label: "رقم الطلب",
        visible: false,
        onToggleVisible: () => undefined,
        name: "ref",
        defaultValue: "YZ-SECRET",
      }),
    );
    expect(html).toContain('type="password"');
    expect(html).not.toContain('type="text"');
  });

  it("reveals only when visible is true", () => {
    const html = renderToStaticMarkup(
      createElement(SecretField, {
        id: "track-phone",
        label: "موبايل",
        visible: true,
        onToggleVisible: () => undefined,
        name: "phone",
      }),
    );
    expect(html).toContain('type="text"');
  });

  it("wires an independent toggle control to the field id", () => {
    const onToggle = vi.fn();
    const html = renderToStaticMarkup(
      createElement(SecretField, {
        id: "track-ref",
        label: "رقم الطلب",
        visible: false,
        onToggleVisible: onToggle,
      }),
    );
    expect(html).toContain('aria-controls="track-ref"');
    expect(html).toContain('aria-pressed="false"');
  });
});
