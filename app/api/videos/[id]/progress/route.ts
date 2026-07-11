import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser } from "@/lib/api";
import { LIMITS } from "@/lib/ratelimit";

type Params = [{ params: Promise<{ id: string }> }];

// Records how far the viewer got — powers Continue Watching and the
// creator's completion-rate analytics. Updates today's watch event
// (created by /view) or creates a bare one; never bumps viewCount.
export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const progressSec =
    typeof body.progressSec === "number" && Number.isFinite(body.progressSec)
      ? Math.max(0, Math.floor(body.progressSec))
      : 0;
  const completed = body.completed === true;

  const video = await prisma.video.findUnique({
    where: { id },
    select: { durationSec: true },
  });
  if (!video) return NextResponse.json({ ok: true });
  const clamped = Math.min(progressSec, video.durationSec);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const latest = await prisma.watchEvent.findFirst({
    where: { userId: user.id, videoId: id, watchedAt: { gte: dayStart } },
    orderBy: { watchedAt: "desc" },
    select: { id: true, progressSec: true, completed: true },
  });
  if (latest) {
    await prisma.watchEvent.update({
      where: { id: latest.id },
      data: {
        progressSec: Math.max(latest.progressSec, clamped),
        completed: latest.completed || completed,
        watchedAt: new Date(), // keeps Continue Watching in recency order
      },
    });
  } else {
    await prisma.watchEvent.create({
      data: { userId: user.id, videoId: id, progressSec: clamped, completed },
    });
  }
  return NextResponse.json({ ok: true });
}, LIMITS.telemetry);
