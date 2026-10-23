import { describe, expect, it } from "vitest";
import {
  checkUpload,
  draftPathId,
  draftPathPrefix,
  isAllowedContentType,
  MAX_FILE_BYTES,
  qualityFlagFor,
} from "./files";

describe("checkUpload", () => {
  it.each(["logo.png", "LOGO.JPG", "a.jpeg", "b.pdf", "c.ai", "d.psd", "e.svg"])(
    "accepts design file %s",
    (fileName) => {
      expect(checkUpload({ kind: "design", fileName }).ok).toBe(true);
    },
  );

  it("accepts spreadsheets only as a names sheet", () => {
    expect(checkUpload({ kind: "names_sheet", fileName: "names.xlsx" }).ok).toBe(true);
    expect(checkUpload({ kind: "names_sheet", fileName: "names.csv" }).ok).toBe(true);
    expect(checkUpload({ kind: "design", fileName: "names.xlsx" }).ok).toBe(false);
    expect(checkUpload({ kind: "names_sheet", fileName: "photo.png" }).ok).toBe(false);
  });

  it("rejects other types and oversize files", () => {
    expect(checkUpload({ kind: "design", fileName: "virus.exe" }).ok).toBe(false);
    expect(checkUpload({ kind: "design", fileName: "noext" }).ok).toBe(false);
    expect(
      checkUpload({ kind: "design", fileName: "big.png", sizeBytes: MAX_FILE_BYTES + 1 }).ok,
    ).toBe(false);
  });
});

describe("qualityFlagFor", () => {
  it("flags small images", () => {
    expect(qualityFlagFor({ width: 640, height: 480 })).toBe("low_res");
    expect(qualityFlagFor({ width: 2480, height: 3508 })).toBe("ok");
    expect(qualityFlagFor(null)).toBeNull();
  });
});

describe("isAllowedContentType", () => {
  it("accepts photoshop MIME for .psd and rejects octet-stream", () => {
    expect(isAllowedContentType("design", "a.psd", "image/vnd.adobe.photoshop")).toBe(true);
    expect(isAllowedContentType("design", "a.psd", "application/octet-stream")).toBe(false);
  });
});

describe("draftPathPrefix", () => {
  const key = "22222222-2222-4222-8222-222222222222";

  it("uses a non-reversible id and never embeds the raw submission UUID", async () => {
    const prefix = await draftPathPrefix(key);
    const id = await draftPathId(key);
    expect(prefix).toBe(`drafts/${id}/`);
    expect(prefix).not.toContain(key);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(await draftPathId(key)).toBe(id);
    expect(await draftPathId("33333333-3333-4333-8333-333333333333")).not.toBe(id);
  });
});
