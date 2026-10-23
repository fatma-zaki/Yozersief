/** Metadata returned by storage after a successful head (authoritative size/type/path). */
export type StoredBlobMeta = {
  size: number;
  pathname: string;
  contentType: string;
  url: string;
};

/** File storage port (brief A6.5). Vercel Blob implements it; tests can swap in memory. */
export interface FileStorage {
  /** Removes a stored file, e.g. after a failed confirmation. */
  delete(storageKey: string): Promise<void>;
  /** Short-lived download URL for staff. */
  downloadUrl(storageKey: string): Promise<string>;
  /** Authoritative blob metadata (size, pathname, content type). Throws if missing. */
  head(storageKey: string): Promise<StoredBlobMeta>;
}
