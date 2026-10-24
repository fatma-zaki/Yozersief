/** Metadata returned by storage after a successful head (authoritative size/type/path). */
export type StoredBlobMeta = {
  size: number;
  pathname: string;
  contentType: string;
  url: string;
};

export type StoredBlobContent = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
};

/** File storage port (brief A6.5). Vercel Blob implements it; tests can swap in memory. */
export interface FileStorage {
  /** Removes a stored file, e.g. after a failed confirmation. */
  delete(storageKey: string): Promise<void>;
  /**
   * Where staff open a file: our own route, which checks access and streams the blob (the store
   * may be private, and the CSP only allows images from 'self').
   */
  downloadUrl(storageKey: string): Promise<string>;
  /** Reads a stored file for streaming to an authorised viewer; null when it is gone. */
  read(storageKey: string): Promise<StoredBlobContent | null>;
  /** Authoritative blob metadata (size, pathname, content type). Throws if missing. */
  head(storageKey: string): Promise<StoredBlobMeta>;
}
