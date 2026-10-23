/**
 * Upload rules (brief A6.5, B10). Pure. Max size is a pending decision (B13 #5), assumed 20 MB.
 */
export const FILE_KINDS = ["design", "reference", "names_sheet", "mockup"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const DESIGN_TYPES: Record<string, readonly string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  pdf: ["application/pdf"],
  svg: ["image/svg+xml"],
  ai: ["application/postscript", "application/illustrator", "application/pdf"],
  psd: ["image/vnd.adobe.photoshop", "application/x-photoshop", "application/octet-stream"],
};

const SHEET_TYPES: Record<string, readonly string[]> = {
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  pdf: ["application/pdf"],
};

export function allowedTypesFor(kind: FileKind): Record<string, readonly string[]> {
  return kind === "names_sheet" ? SHEET_TYPES : DESIGN_TYPES;
}

export function allowedContentTypes(kind: FileKind): string[] {
  return [...new Set(Object.values(allowedTypesFor(kind)).flat())];
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export type FileCheck = { ok: true } | { ok: false; message: string };

export function checkUpload(input: {
  kind: FileKind;
  fileName: string;
  sizeBytes?: number;
}): FileCheck {
  const ext = extensionOf(input.fileName);
  if (!(ext in allowedTypesFor(input.kind))) {
    const list = Object.keys(allowedTypesFor(input.kind)).join("، ");
    return { ok: false, message: `نوع الملف مش مدعوم. الأنواع المتاحة: ${list}.` };
  }
  if (input.sizeBytes !== undefined && input.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, message: "حجم الملف أكبر من 20 ميجا. صغّره أو ابعته على واتساب." };
  }
  return { ok: true };
}

/** Print needs roughly 150 DPI at A4 (~1240×1754 px). Smaller images are flagged, not rejected. */
const MIN_PRINT_PIXELS = 1200 * 1200;

export function qualityFlagFor(
  image: { width: number; height: number } | null,
): "ok" | "low_res" | null {
  if (!image) return null;
  return image.width * image.height < MIN_PRINT_PIXELS ? "low_res" : "ok";
}
