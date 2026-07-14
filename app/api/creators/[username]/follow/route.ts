import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

type Params = [{ params: Promise<{ username: string }> }];

// Toggle following a creator. Keyed by username; you can't follow yourself.
export const POST = withUser<Params>(async (user, _req, { params }) => {
  const { username } = await params;
  const creator = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, suspended: true },
  });
  if (!creator || creator.suspended) return jsonError("Creator not found.", 404);
  if (creator.id === user.id) return jsonError("You can't follow yourself.", 400);

  const key = { followerId_creatorId: { followerId: user.id, creatorId: creator.id } };
  const existing = await prisma.creatorFollow.findUnique({ where: key });
  try {
    if (existing) {
      await prisma.creatorFollow.delete({ where: key });
      return NextResponse.json({ ok: true, following: false });
    }
    await prisma.creatorFollow.create({
      data: { followerId: user.id, creatorId: creator.id },
    });
    return NextResponse.json({ ok: true, following: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") return NextResponse.json({ ok: true, following: true });
    if (code === "P2025") return NextResponse.json({ ok: true, following: false });
    throw err;
  }
});
