import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

// The video's creator can pin one comment to the top of the thread.
export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const pinned = body.pinned === true;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, videoId: true, video: { select: { creatorId: true } } },
  });
  if (!comment) return jsonError("Comment not found.", 404);
  if (comment.video.creatorId !== user.id) {
    return jsonError("Only the video's creator can pin comments.", 403);
  }

  await prisma.$transaction([
    // One pin per video: unpin everything first.
    prisma.comment.updateMany({
      where: { videoId: comment.videoId, pinned: true },
      data: { pinned: false },
    }),
    ...(pinned
      ? [prisma.comment.update({ where: { id }, data: { pinned: true } })]
      : []),
  ]);
  return NextResponse.json({ ok: true, pinned });
});
