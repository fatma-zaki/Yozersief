import { del, head } from "@vercel/blob";
import { env } from "@/env";
import type { FileStorage, StoredBlobMeta } from "../application/file-storage";
import type { BlobUploadMode } from "../domain/files";

/**
 * Vercel Blob adapter. Uploads go straight from the browser to Blob with a server-issued
 * token (see /api/uploads/token), so files never pass through our functions.
 */
export class VercelBlobStorage implements FileStorage {
  /** Without a token the SDK uses Vercel OIDC with BLOB_STORE_ID. */
  constructor(private readonly token?: string) {}

  async delete(storageKey: string) {
    await del(storageKey, { token: this.token });
  }

  async downloadUrl(storageKey: string) {
    // Blob URLs are unguessable; access control happens before we hand the URL out.
    return storageKey;
  }

  async head(storageKey: string): Promise<StoredBlobMeta> {
    const meta = await head(storageKey, { token: this.token });
    return {
      size: meta.size,
      pathname: meta.pathname,
      contentType: meta.contentType,
      url: meta.url,
    };
  }
}

export function blobUploadMode(): BlobUploadMode | null {
  if (env.BLOB_READ_WRITE_TOKEN) return "token";
  return env.BLOB_STORE_ID ? "presigned" : null;
}

export function createFileStorage(): FileStorage | null {
  if (env.BLOB_READ_WRITE_TOKEN) return new VercelBlobStorage(env.BLOB_READ_WRITE_TOKEN);
  return env.BLOB_STORE_ID ? new VercelBlobStorage() : null;
}
