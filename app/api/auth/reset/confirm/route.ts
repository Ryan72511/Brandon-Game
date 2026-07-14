import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/session";
import { jsonError, cleanString, rateLimitByIp } from "@/lib/api";
import { hashToken, tokensEqual, expired } from "@/lib/tokens";

// Finish an emailed password reset: validate the link token, set the new
// password, log out every existing session, and sign the user in.
export async function POST(req: Request) {
  const limited = rateLimitByIp(req);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const token = cleanString(body.token, 128);
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!token) {
    return jsonError("That link is missing its code — open the link from your email again.", 400);
  }
  if (newPassword.length < 6) {
    return jsonError("Your new password must be at least 6 characters.", 400);
  }

  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({ where: { resetTokenHash: tokenHash } });
  if (
    !user?.resetTokenHash ||
    !tokensEqual(user.resetTokenHash, tokenHash) ||
    expired(user.resetExpires)
  ) {
    return jsonError("That reset link isn't valid anymore. Ask for a new one.", 400);
  }
  if (user.suspended) {
    return jsonError("This account is suspended. Contact support@gasp.app.", 403);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        resetTokenHash: null,
        resetExpires: null,
      },
    }),
    // Reset kills every existing session — same rule as the recovery-code path.
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
