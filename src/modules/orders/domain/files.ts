/**
 * Upload rules (brief A6.5, B10). Pure. Max size is a pending decision (B13 #5), assumed 20 MB.
 */
export const FILE_KINDS = ["design", "reference", "names_sheet", "mockup"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const DRAFT_PATH_PURPOSE = "yz-draft-path:v1:";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Non-reversible public folder id for Blob pathnames.
 * Derived with SHA-256 so the client can compute it without the server secret; the raw
 * submission UUID must never appear in public paths. This id is not a capability — claiming
 * drafts still requires the raw submission key (HMAC-bound in `upload_drafts`).
 */
export async function draftPathId(submissionKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${DRAFT_PATH_PURPOSE}${submissionKey}`),
  );
  return toHex(digest);
}

/** Pathname must stay under `drafts/{draftPathId}/` so confirm can bind ownership without leaking the key. */
export async function draftPathPrefix(submissionKey: string): Promise<string> {
  return `drafts/${await draftPathId(submissionKey)}/`;
}

const DESIGN_TYPES: Record<string, readonly string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  pdf: ["application/pdf"],
  svg: ["image/svg+xml"],
  ai: ["application/postscript", "application/illustrator", "application/pdf"],
  // Do not accept application/octet-stream: that would allow arbitrary bytes under a .psd name.
  psd: ["image/vnd.adobe.photoshop", "application/x-photoshop"],
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

/** True when `contentType` is allowed for this kind + filename extension. */
export function isAllowedContentType(
  kind: FileKind,
  fileName: string,
  contentType: string,
): boolean {
  const ext = extensionOf(fileName);
  const types = allowedTypesFor(kind)[ext];
  if (!types) return false;
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return types.some((t) => t.toLowerCase() === normalized);
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
    return { ok: false, message: `نوع الملف غير مدعوم. الأنواع المتاحة: ${list}.` };
  }
  if (input.sizeBytes !== undefined && input.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, message: "حجم الملف أكبر من 20 ميجابايت. صغّر حجمه أو أرسله عبر واتساب." };
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

/**
 * How the browser uploads to Vercel Blob: `token` (client token from a read-write token,
 * client `upload`) or `presigned` (stores on Vercel OIDC with BLOB_STORE_ID, `uploadPresigned`).
 */
export type BlobUploadMode = "token" | "presigned";
