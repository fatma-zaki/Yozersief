/** File storage port (brief A6.5). Vercel Blob implements it; tests can swap in memory. */
export interface FileStorage {
  /** Removes a stored file, e.g. after a failed confirmation. */
  delete(storageKey: string): Promise<void>;
  /** Short-lived download URL for staff. */
  downloadUrl(storageKey: string): Promise<string>;
}
