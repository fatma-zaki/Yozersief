"use client";

import { upload } from "@vercel/blob/client";
import { submitOrderAction } from "@/app/(order)/order/actions";
import { draftPathPrefix } from "../../domain/files";
import { isNamesSheet, type DraftFile, type RequestDraft } from "../../domain/request";

export type SubmitResult = { ok: true; ref: string } | { ok: false; error: string };

/** Real submission is wired; demo banner stays off. */
export const DEMO_MODE = false;

const SUBMISSION_KEY_STORAGE = "yz:order-submission-key:v1";
const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * In-memory fallback when sessionStorage is unavailable (private mode, SecurityError, etc.).
 * Stable for this JS realm / tab lifetime only. After a full page reload without working
 * persistent storage, a new key is minted — retries across reloads will not share idempotency.
 */
let memorySubmissionKey: string | null = null;

/** @internal test helper — resets module memory between cases. */
export function _resetSubmissionKeyMemoryForTests(): void {
  memorySubmissionKey = null;
}

/** Stable per-tab key: owns draft uploads and idempotent submit retries. */
export function getOrCreateSubmissionKey(): string {
  try {
    const existing = sessionStorage.getItem(SUBMISSION_KEY_STORAGE);
    if (existing && UUID_RE.test(existing)) {
      memorySubmissionKey = existing;
      return existing;
    }
  } catch {
    // sessionStorage getter or getItem failed — use memory below.
  }

  if (memorySubmissionKey && UUID_RE.test(memorySubmissionKey)) {
    return memorySubmissionKey;
  }

  const key = crypto.randomUUID();
  memorySubmissionKey = key;
  try {
    sessionStorage.setItem(SUBMISSION_KEY_STORAGE, key);
  } catch {
    // setItem failed — memory key remains stable until reload/clear.
  }
  return key;
}

export function clearSubmissionKey(): void {
  memorySubmissionKey = null;
  try {
    sessionStorage.removeItem(SUBMISSION_KEY_STORAGE);
  } catch {
    // private mode
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 120) || "file";
}

async function confirmDraftUpload(input: {
  url: string;
  pathname: string;
  contentType: string;
  requestedPathname: string;
  clientPayload: string;
}): Promise<void> {
  const res = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "تأكيد رفع الملف فشل.");
  }
}

/**
 * Uploads one local file as an anonymous draft bound to `submissionKey`.
 * Confirms via `/api/uploads/confirm` so localhost (no Blob callback) still persists drafts.
 */
export async function uploadDraftFile(input: {
  file: File;
  submissionKey: string;
  kind: "design" | "names_sheet";
}): Promise<void> {
  const requestedPathname = `${await draftPathPrefix(input.submissionKey)}${safeFileName(input.file.name)}`;
  const clientPayload = JSON.stringify({
    kind: input.kind,
    submissionKey: input.submissionKey,
  });

  const blob = await upload(requestedPathname, input.file, {
    access: "public",
    handleUploadUrl: "/api/uploads/token",
    clientPayload,
  });

  await confirmDraftUpload({
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    requestedPathname,
    clientPayload,
  });
}

export type SubmitRequestOptions = {
  submissionKey: string;
  /** Local File objects keyed by DraftFile.id (browsers cannot restore these from sessionStorage). */
  fileBlobs: Map<string, File>;
};

/**
 * Uploads any pending local files, then calls the submit server action.
 * `draft` must already pass readiness checks on the client; the server re-validates with Zod.
 */
export async function submitRequest(
  draft: RequestDraft,
  options: SubmitRequestOptions,
): Promise<SubmitResult> {
  const { submissionKey, fileBlobs } = options;
  const doneFiles = draft.files.filter((f) => f.status === "done");

  for (const meta of doneFiles) {
    if (meta.uploaded) continue;
    const file = fileBlobs.get(meta.id);
    if (!file) {
      return {
        ok: false,
        error: "في ملف اتشال من المتصفح. ارفعه تاني من خطوة التصميم.",
      };
    }
    const kind = isNamesSheet(meta) ? "names_sheet" : "design";
    try {
      await uploadDraftFile({ file, submissionKey, kind });
      meta.uploaded = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "رفع الملف فشل.";
      return { ok: false, error: message };
    }
  }

  const hasDesignFiles = doneFiles.some((f) => !isNamesSheet(f));
  const hasNamesSheet = doneFiles.some(isNamesSheet);

  const result = await submitOrderAction({
    submissionKey,
    ctype: draft.ctype,
    cat: draft.cat,
    prod: draft.prod,
    color: draft.color,
    qty: draft.qty,
    sizes: draft.sizes,
    places: draft.places,
    text: draft.text,
    model: draft.model,
    w: draft.w,
    h: draft.h,
    unit: draft.unit,
    shape: draft.shape,
    use: draft.use,
    desc: draft.desc,
    notes: draft.notes,
    sample: draft.sample,
    perPiece: draft.perPiece,
    batches: draft.batches,
    batchNotes: draft.batchNotes,
    help: draft.help,
    artNotes: draft.artNotes,
    hasDesignFiles,
    hasNamesSheet,
    org: draft.org,
    role: draft.role,
    invoice: draft.invoice,
    taxId: draft.taxId,
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    date: draft.date,
    receipt: draft.receipt,
    address: draft.address,
  });

  if (result.ok) return { ok: true, ref: result.data.ref };
  return { ok: false, error: result.error };
}

/** @deprecated kept for type-only imports of DraftFile upload flag helpers */
export type { DraftFile };
