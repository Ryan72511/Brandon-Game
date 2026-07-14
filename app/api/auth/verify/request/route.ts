import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { LIMITS } from "@/lib/ratelimit";
import { sendEmail, verificationEmail } from "@/lib/email";
import { generateToken, hashToken, expiry, VERIFY_TOKEN_TTL_MS } from "@/lib/tokens";

// Re-send the verification email to the signed-in user. Rate-limited on the
// "create" tier — every call can send real mail, so keep it slower than
// ordinary writes.
export const POST = withUser(async (user) => {
  if (!user.email) {
    return jsonError("There's no email on this account yet.", 400);
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpires: expiry(VERIFY_TOKEN_TTL_MS),
    },
  });
  await sendEmail(verificationEmail(user.email, token));
  return NextResponse.json({ ok: true });
}, LIMITS.create);
