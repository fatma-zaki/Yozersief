import { describe, expect, it } from "vitest";
import { applyGalleryChange, galleryState, galleryStats } from "./gallery";

describe("gallery consent rule", () => {
  it("names the three states", () => {
    expect(galleryState({ customerConsent: true, isPublished: true })).toBe("pub");
    expect(galleryState({ customerConsent: true, isPublished: false })).toBe("hidden");
    expect(galleryState({ customerConsent: false, isPublished: false })).toBe("pending");
  });

  it("counts published, hidden and waiting for consent", () => {
    expect(
      galleryStats([
        { customerConsent: true, isPublished: true },
        { customerConsent: true, isPublished: false },
        { customerConsent: false, isPublished: false },
        { customerConsent: false, isPublished: false },
      ]),
    ).toEqual({ published: 1, hidden: 1, pending: 2 });
  });

  it("refuses to publish without consent", () => {
    expect(
      applyGalleryChange({ customerConsent: false, isPublished: false }, { published: true }),
    ).toMatchObject({ ok: false });
  });

  it("allows consent and publish together", () => {
    expect(
      applyGalleryChange(
        { customerConsent: false, isPublished: false },
        { consent: true, published: true },
      ),
    ).toEqual({ ok: true, flags: { customerConsent: true, isPublished: true } });
  });

  it("unpublishes when consent is withdrawn", () => {
    expect(
      applyGalleryChange({ customerConsent: true, isPublished: true }, { consent: false }),
    ).toEqual({ ok: true, flags: { customerConsent: false, isPublished: false } });
  });
});
