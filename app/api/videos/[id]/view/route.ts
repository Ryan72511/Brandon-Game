import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api";
import { canInteractWithVideo } from "@/lib/data";
import { LIMITS } from "@/lib/ratelimit";

type Params = [{ params: Promise<{ id: string }> }];

// Records a watch signal (feeds recommendations + view counts). Counted at
// most once per user/video/day so replays don't inflate views.
export const POST = withUser<Params>(async (user, _req, { params }) => {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!video) return NextResponse.json({ ok: true }); // silently ignore
  // Don't let views be recorded (or the counter inflated) on a video the
  // caller couldn't watch — draft/removed/mature/suspended.
  if (!(await canInteractWithVideo(id, user))) return NextResponse.json({ ok: true });

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const already = await prisma.watchEvent.findFirst({
    where: { userId: user.id, videoId: id, watchedAt: { gte: dayStart } },
    select: { id: true },
  });
  if (!already) {
    await prisma.$transaction([
      prisma.watchEvent.create({ data: { userId: user.id, videoId: id } }),
      prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}, LIMITS.telemetry);
