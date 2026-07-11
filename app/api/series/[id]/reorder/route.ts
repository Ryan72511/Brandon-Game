import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

// Move an episode up or down in its series by swapping episodeNumber with
// the adjacent episode. A move past either end is a quiet no-op.
export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const series = await prisma.series.findUnique({ where: { id }, select: { creatorId: true } });
  if (!series) return jsonError("Series not found.", 404);
  if (series.creatorId !== user.id) return jsonError("This isn't your series.", 403);

  const body = (await req.json().catch(() => ({}))) as { videoId?: unknown; direction?: unknown };
  const videoId = typeof body.videoId === "string" ? body.videoId : "";
  const direction = body.direction;
  if (!videoId || (direction !== "up" && direction !== "down")) {
    return jsonError("Say which episode and which way.", 400);
  }

  await prisma.$transaction(async (tx) => {
    const episodes = await tx.video.findMany({
      where: { seriesId: id },
      orderBy: { episodeNumber: "asc" },
      select: { id: true, episodeNumber: true },
    });
    const index = episodes.findIndex((e) => e.id === videoId);
    if (index === -1) return;
    const otherIndex = direction === "up" ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= episodes.length) return; // already at the end
    const a = episodes[index];
    const b = episodes[otherIndex];
    await tx.video.update({ where: { id: a.id }, data: { episodeNumber: b.episodeNumber } });
    await tx.video.update({ where: { id: b.id }, data: { episodeNumber: a.episodeNumber } });
  });

  return NextResponse.json({ ok: true });
});
