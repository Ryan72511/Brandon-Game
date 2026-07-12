import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { hashPassword, verifyPassword, createSession } from "@/lib/session";
import { LIMITS } from "@/lib/ratelimit";

// Change your password while signed in (requires the current one).
export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row || !verifyPassword(current, row.passwordHash)) {
    return jsonError("Your current password isn't right.", 401);
  }
  if (next.length < 6) {
    return jsonError("Your new password must be at least 6 characters.", 400);
  }
  // A password change logs out every other session — a stolen or shared cookie
  // should stop working the moment you change your password. We then re-issue a
  // fresh session for the person doing the change so they stay signed in. (The
  // recovery code isn't rotated here: it was never spent, and it's only shown
  // once at signup, so re-rotating it would silently invalidate the user's
  // saved code with no way to display the new one.)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(next) },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}, LIMITS.auth);
