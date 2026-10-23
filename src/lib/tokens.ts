/**
 * Random tokens and codes, and their hashes. Every token/code is stored hashed (brief A6.8).
 * Uses Web Crypto so it runs in Node, Edge and tests alike.
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** URL-safe random token, 32 bytes of entropy by default. */
export function generateToken(byteLength = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** Uniform 6-digit numeric code (rejection sampling avoids modulo bias). */
export function generateOtp(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value < limit) return String(value % 1_000_000).padStart(6, "0");
  }
}

/** HMAC-SHA256 of a token with a server-side secret. Deterministic, so it can be looked up by hash. */
export async function hashToken(token: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(token)));
}

/** Constant-time string comparison for hashes of equal length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
