import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  allowRequest,
  isBlocked,
  recordFailure,
  clientIp,
  LIMITS,
  type RateLimit,
} from "@/lib/ratelimit";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type UserRow = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Wraps a handler with auth, rate limiting, and uniform error handling.
// Rate key is the user id (stable across networks); limit tier defaults to
// "write" — pass another tier for uploads/creates.
export function withUser<Args extends unknown[]>(
  handler: (user: UserRow, req: Request, ...args: Args) => Promise<Response>,
  limit: RateLimit = LIMITS.write
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) return jsonError("Please sign in first.", 401);
    // GETs are never limited; mutations are.
    if (req.method !== "GET" && !allowRequest(`u:${user.id}:${limit.perMinute}`, limit)) {
      return jsonError("Whoa, slow down a little — try again in a minute.", 429);
    }
    try {
      return await handler(user, req, ...args);
    } catch (err) {
      console.error(err);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}

// IP-keyed limiter for unauthenticated routes — a generous flood ceiling
// (a whole household/school shares one NAT IP, so this must not lock out
// legit users; targeted brute-force is stopped per-account below).
export function rateLimitByIp(req: Request, tier: RateLimit = LIMITS.authIp): Response | null {
  if (!allowRequest(`ip:${clientIp(req)}:${tier.perMinute}`, tier)) {
    return jsonError("Too many attempts — wait a minute and try again.", 429);
  }
  return null;
}

// Per-account limiter for login/reset — the real brute-force surface. Keyed
// by the username being attacked, so guessing one account's password can't
// be sped up by switching IPs, and one account's attempts don't affect
// anyone else on the same network.
//
// Failure-only: this PEEKS the bucket (never consumes) so a legitimate owner
// with the right password/code is never throttled. Only genuinely wrong
// attempts spend a token, via recordAccountFailure() below. That closes the
// account-lockout DoS where an attacker floods a victim's username with junk
// guesses to keep the victim out of their own account.
function accountKey(username: string, tier: RateLimit): string {
  const key = username.trim().toLowerCase() || "unknown";
  return `acct:${key}:${tier.perMinute}`;
}

export function rateLimitByAccount(username: string, tier: RateLimit = LIMITS.auth): Response | null {
  if (isBlocked(accountKey(username, tier), tier)) {
    return jsonError("Too many tries for this account — wait a minute.", 429);
  }
  return null;
}

// Call ONLY on a failed credential/recovery-code check — spends one token
// against the account's brute-force budget.
export function recordAccountFailure(username: string, tier: RateLimit = LIMITS.auth): void {
  recordFailure(accountKey(username, tier), tier);
}

export function cleanString(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}
