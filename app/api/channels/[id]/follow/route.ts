import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

// Toggle: follow if not following, unfollow if already following.
export const POST = withUser<Params>(async (user, _req, { params }) => {
  const { id } = await params;
  const channel = await prisma.channel.findUnique({ where: { id }, select: { id: true } });
  if (!channel) return jsonError("Channel not found.", 404);

  // Double-taps race the check: unique-violation and missing-row errors
  // just mean the other tap won — report the resulting state.
  const existing = await prisma.follow.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: id } },
  });
  try {
    if (existing) {
      await prisma.follow.delete({
        where: { userId_channelId: { userId: user.id, channelId: id } },
      });
      return NextResponse.json({ ok: true, following: false });
    }
    await prisma.follow.create({ data: { userId: user.id, channelId: id } });
    return NextResponse.json({ ok: true, following: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") return NextResponse.json({ ok: true, following: true });
    if (code === "P2025") return NextResponse.json({ ok: true, following: false });
    throw err;
  }
});
