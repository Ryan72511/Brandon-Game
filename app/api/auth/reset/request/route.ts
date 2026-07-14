import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, rateLimitByIp } from "@/lib/api";
import { LIMITS } from "@/lib/ratelimit";
import { normalizeEmail, sendEmail, resetEmail } from "@/lib/email";
import { generateToken, hashToken, expiry, RESET_TOKEN_TTL_MS } from "@/lib/tokens";

// Ask for a password-reset link by email. The response is identical whether
// or not the address has an account — no enumeration oracle. The recovery-
// code reset at /api/auth/reset keeps working alongside this.
export async function POST(req: Request) {
  // Tighter per-IP tier than the auth flood ceiling: every accepted request
  // here can send real mail, so cap the spam blast radius.
  const limited = rateLimitByIp(req, LIMITS.auth);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email) {
    return jsonError("Please enter a valid email address.", 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.suspended) {
    const token = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: hashToken(token), resetExpires: expiry(RESET_TOKEN_TTL_MS) },
    });
    await sendEmail(resetEmail(email, token));
  }
  // Uniform body for known and unknown addresses alike.
  return NextResponse.json({ ok: true });
}
