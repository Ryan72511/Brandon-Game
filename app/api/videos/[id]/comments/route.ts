import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

type Params = [{ params: Promise<{ id: string }> }];

const PAGE_SIZE = 30;

// Cursor-paginated: pinned comment first, then newest-first. Pass ?cursor=
// (last comment id from the previous page) for the next page.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cursor = new URL(req.url).searchParams.get("cursor");
  // Suspended users' comments are hidden for everyone; blocked users'
  // comments are hidden for the viewer who blocked them.
  const viewer = await getCurrentUser();
  const blocked = viewer
    ? (
        await prisma.block.findMany({
          where: { blockerId: viewer.id },
          select: { blockedId: true },
        })
      ).map((b) => b.blockedId)
    : [];
  const comments = await prisma.comment.findMany({
    where: {
      videoId: id,
      user: { suspended: false },
      ...(blocked.length > 0 ? { userId: { notIn: blocked } } : {}),
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, displayName: true, avatarEmoji: true, avatarColor: true } },
    },
  });
  const hasMore = comments.length > PAGE_SIZE;
  const page = hasMore ? comments.slice(0, PAGE_SIZE) : comments;
  return NextResponse.json({
    comments: page.map((c) => ({
      id: c.id,
      text: c.text,
      timecodeSec: c.timecodeSec,
      pinned: c.pinned,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
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
