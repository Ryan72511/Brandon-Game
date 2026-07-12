import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { destroySession } from "@/lib/session";
import { invalidateCandidateCache } from "@/lib/recs";
import { MEDIA_ROOT } from "@/lib/storage";

// Permanent account deletion (App Store requirement — real deletion, not
// deactivation). Removes the user row; Prisma cascades take videos,
// channels, ratings, comments, friendships, follows, blocks, reports,
// watch history, notifications, and sessions with it. Uploaded media
// files are unlinked best-effort.
export const DELETE = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== user.username) {
    return jsonError("Type your username to confirm.", 400);
  }
  const uploads = await prisma.video.findMany({
    where: { creatorId: user.id },
    select: { src: true, thumb: true },
  });

  // The last admin can't delete themselves — someone must hold the keys.
  // Count and delete in one transaction so two admins deleting at once can't
  // both slip past the guard.
  try {
    await prisma.$transaction(async (tx) => {
      if (user.role === "admin") {
        const admins = await tx.user.count({ where: { role: "admin", suspended: false } });
        if (admins <= 1) throw new Error("LAST_ADMIN");
      }
      await tx.user.delete({ where: { id: user.id } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LAST_ADMIN") {
      return jsonError("You're the only moderator — hand that off first.", 400);
    }
    throw err;
  }
  await destroySession();
  invalidateCandidateCache();

  // Best-effort media cleanup, restricted to the uploads directory.
  for (const v of uploads) {
    for (const url of [v.src, v.thumb]) {
      if (url.startsWith("/media/uploads/")) {
        const file = path.join(MEDIA_ROOT, "uploads", path.basename(url));
        await unlink(file).catch(() => {});
      }
    }
  }
  return NextResponse.json({ ok: true });
});
