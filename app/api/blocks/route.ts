import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";

// POST { username } — block a user. Their videos and comments disappear
// for the blocker everywhere in the app (enforced by the feed queries).
export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  if (!username) return jsonError("Missing username.", 400);
  if (username === user.username) return jsonError("You can't block yourself.", 400);

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) return jsonError("No one has that username.", 404);

  try {
    await prisma.block.create({ data: { blockerId: user.id, blockedId: target.id } });
  } catch (err) {
    // Already blocked — that's fine, blocking is idempotent.
    if ((err as { code?: string }).code !== "P2002") throw err;
  }
  return NextResponse.json({ ok: true, blocked: true });
});

// DELETE { username } — unblock.
export const DELETE = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  if (!username) return jsonError("Missing username.", 400);

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) return jsonError("No one has that username.", 404);

  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: target.id } });
  return NextResponse.json({ ok: true, blocked: false });
});
