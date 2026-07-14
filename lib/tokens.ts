import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// One-time tokens for the email verify + reset links. The raw token travels
// only inside the emailed link; the database stores its SHA-256. SHA-256 is
// deliberately unsalted-deterministic here (unlike passwords) so the row is
// look-up-able by hashing the presented token — safe because the input is
// 256 bits of CSPRNG output, not a guessable secret.

// 24h to click a signup email; reset links are hotter, so one hour.
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Constant-time hex comparison — belt and braces on top of the hashed
// lookup, so no comparison over token material ever short-circuits.
export function tokensEqual(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function expiry(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}

// Null/missing expiry counts as expired — a token without a deadline is a bug.
export function expired(expiresAt: Date | null | undefined): boolean {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}
