import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { notify } from "@/lib/notify";

// POST { username } — send a friend request (auto-accepts if they already
// asked you). PATCH { friendshipId, action: "accept" | "decline" }.
export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  if (!username) return jsonError("Type a username.", 400);
  if (username === user.username) return jsonError("That's you!", 400);

  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!other) return jsonError("No one has that username. Check the spelling?", 404);

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: other.id },
        { requesterId: other.id, addresseeId: user.id },
      ],
    },
  });
  if (existing) {
    if (existing.status === "accepted") return jsonError("You're already friends!", 409);
    if (existing.requesterId === user.id) return jsonError("Request already sent.", 409);
    // They asked first — this counts as accepting.
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    await notify(
      existing.requesterId,
      "friend_accept",
      `${user.displayName} said yes — you're friends now!`,
      "/friends"
    );
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  try {
    await prisma.friendship.create({
      data: {
        requesterId: user.id,
        addresseeId: other.id,
        pairKey: [user.id, other.id].sort().join(":"),
      },
    });
  } catch (err) {
    // Concurrent mutual invites: the pairKey constraint caught the race.
    if ((err as { code?: string }).code === "P2002") {
      return jsonError("Request already sent.", 409);
    }
    throw err;
  }
  await notify(
    other.id,
    "friend_request",
    `${user.displayName} wants to be your friend`,
    "/friends"
  );
  return NextResponse.json({ ok: true, status: "pending" });
});

export const PATCH = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const friendshipId = typeof body.friendshipId === "string" ? body.friendshipId : "";
  const action = body.action;

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== user.id) {
    return jsonError("Request not found.", 404);
  }
  if (action === "accept") {
    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: "accepted" } });
    await notify(
      friendship.requesterId,
      "friend_accept",
      `${user.displayName} said yes — you're friends now!`,
      "/friends"
    );
    return NextResponse.json({ ok: true, status: "accepted" });
  }
  if (action === "decline") {
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return NextResponse.json({ ok: true, status: "declined" });
  }
  return jsonError("Unknown action.", 400);
});
