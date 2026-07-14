import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, cleanString, rateLimitByIp } from "@/lib/api";
import { hashToken, tokensEqual, expired } from "@/lib/tokens";

// Consume an email-verification token (from the link in the signup email)
// and mark the address confirmed. No sign-in required — the link is often
// opened on a different device than the one that signed up.
export async function POST(req: Request) {
  const limited = rateLimitByIp(req);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const token = cleanString(body.token, 128);
  if (!token) {
    return jsonError("That link is missing its code — open the link from your email again.", 400);
  }

  // The DB stores SHA-256(token), so hashing the presented token finds the
  // row; tokensEqual re-checks it in constant time.
  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { emailVerifyTokenHash: tokenHash },
    select: { id: true, emailVerifyTokenHash: true, emailVerifyExpires: true },
  });
  if (
    !user?.emailVerifyTokenHash ||
    !tokensEqual(user.emailVerifyTokenHash, tokenHash) ||
    expired(user.emailVerifyExpires)
  ) {
    return jsonError("That link isn't valid anymore. Ask for a fresh one in Settings.", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerifyTokenHash: null, emailVerifyExpires: null },
  });
  return NextResponse.json({ ok: true });
}
