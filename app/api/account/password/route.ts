import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/session";
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
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next) },
  });
  return NextResponse.json({ ok: true });
}, LIMITS.auth);
