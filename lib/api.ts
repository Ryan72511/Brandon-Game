import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { allowRequest, clientIp, LIMITS, type RateLimit } from "@/lib/ratelimit";

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

// IP-keyed limiter for unauthenticated routes (login/signup).
export function rateLimitByIp(req: Request, tier: RateLimit = LIMITS.auth): Response | null {
  if (!allowRequest(`ip:${clientIp(req)}:${tier.perMinute}`, tier)) {
    return jsonError("Too many attempts — wait a minute and try again.", 429);
  }
  return null;
}

export function cleanString(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}
