import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, dummyVerify } from "@/lib/session";
import {
  jsonError,
  cleanString,
  rateLimitByIp,
  rateLimitByAccount,
  recordAccountFailure,
} from "@/lib/api";

export async function POST(req: Request) {
  const ipLimited = rateLimitByIp(req);
  if (ipLimited) return ipLimited;
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  // Verify FIRST, then throttle only on failure. A correct password is never
  // subject to the per-account limit, so an attacker flooding a victim's
  // username with wrong guesses can never lock the real owner out of their own
  // account — the DoS the old "limit-before-verify" ordering allowed. Wrong
  // guesses still burn the account's budget, so brute-force stays throttled.
  // (The per-IP ceiling above caps total verify volume, bounding scrypt cost.)
  const user = await prisma.user.findUnique({ where: { username } });
  // Run a throwaway scrypt when the user is missing so a nonexistent username
  // costs the same as a wrong password — no timing oracle for enumeration.
  const ok = user ? verifyPassword(password, user.passwordHash) : (dummyVerify(password), false);
  if (!user || !ok) {
    const acctLimited = rateLimitByAccount(username);
    if (acctLimited) return acctLimited;
    recordAccountFailure(username);
    return jsonError("Wrong username or password.", 401);
  }
  if (user.suspended) {
    return jsonError(
      "This account is suspended for breaking the community guidelines. Contact support@gasp.app.",
      403
    );
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
