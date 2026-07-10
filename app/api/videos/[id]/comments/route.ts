import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { videoId: id },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { username: true, displayName: true, avatarEmoji: true, avatarColor: true } },
    },
  });
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      timecodeSec: c.timecodeSec,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
  });
}

export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = cleanString(body.text, 500);
  if (!text) return jsonError("Write something first.", 400);

  const video = await prisma.video.findUnique({
    where: { id },
    select: { durationSec: true },
  });
  if (!video) return jsonError("Video not found.", 404);

  let timecodeSec: number | null = null;
  if (typeof body.timecodeSec === "number" && Number.isFinite(body.timecodeSec)) {
    timecodeSec = Math.max(0, Math.min(Math.floor(body.timecodeSec), video.durationSec));
  }

  const comment = await prisma.comment.create({
    data: { userId: user.id, videoId: id, text, timecodeSec },
    include: {
      user: { select: { username: true, displayName: true, avatarEmoji: true, avatarColor: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    comment: {
      id: comment.id,
      text: comment.text,
      timecodeSec: comment.timecodeSec,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    },
  });
});
