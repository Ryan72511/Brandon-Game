import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/session";
import { jsonError, cleanString, rateLimitByIp, rateLimitByAccount } from "@/lib/api";
import { verifyRecoveryCode, generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery";

// Reset a forgotten password with the recovery code shown at signup. No
// email needed. On success a fresh recovery code is issued (the old one is
// spent) and the user is signed in.
export async function POST(req: Request) {
  const ipLimited = rateLimitByIp(req);
  if (ipLimited) return ipLimited;

  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const recoveryCode = cleanString(body.recoveryCode, 60);
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  const acctLimited = rateLimitByAccount(username);
  if (acctLimited) return acctLimited;

  if (!username || !recoveryCode) {
    return jsonError("Enter your username and recovery code.", 400);
  }
  if (newPassword.length < 6) {
    return jsonError("Your new password must be at least 6 characters.", 400);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Same generic message whether the user or the code is wrong — no oracle.
  if (!user || !user.recoveryCodeHash || !verifyRecoveryCode(recoveryCode, user.recoveryCodeHash)) {
    return jsonError("That username and recovery code don't match.", 401);
  }
  if (user.suspended) {
    return jsonError("This account is suspended. Contact support@reely.app.", 403);
  }

  const nextCode = generateRecoveryCode();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        recoveryCodeHash: hashRecoveryCode(nextCode),
      },
    }),
    // Reset kills every existing session — a password change should log out
    // anyone else who had the old one.
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username, recoveryCode: nextCode });
}
