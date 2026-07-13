import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { RATING_VALUES, type RatingValue } from "@/lib/constants";
import { popcornScore } from "@/lib/score";
import { canInteractWithVideo } from "@/lib/data";

type Params = [{ params: Promise<{ id: string }> }];

// Recompute denormalized counters from the Rating table inside the same
// transaction — never blind increments, so re-rates can't drift the cache.
async function applyRating(videoId: string, userId: string, value: RatingValue | null) {
  return prisma.$transaction(async (tx) => {
    if (value === null) {
      await tx.rating.deleteMany({ where: { userId, videoId } });
    } else {
      // Keep the original createdAt on a re-rate — changing your vote isn't
      // new weekly engagement, so it mustn't jump the rating into this week's
      // chart window (which filters on createdAt).
      await tx.rating.upsert({
        where: { userId_videoId: { userId, videoId } },
        create: { userId, videoId, value },
        update: { value },
      });
    }
    const grouped = await tx.rating.groupBy({
      by: ["value"],
      where: { videoId },
      _count: true,
    });
    const counts = { burnt: 0, popped: 0, butter: 0 };
    for (const g of grouped) {
      if (g.value in counts) counts[g.value as RatingValue] = g._count;
    }
    const score = popcornScore(counts);
    await tx.video.update({
      where: { id: videoId },
      data: {
        burntCount: counts.burnt,
        poppedCount: counts.popped,
        butterCount: counts.butter,
        popcornScore: score,
      },
    });
    return { counts, score };
  });
}

export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const value = body.value as RatingValue;
  if (!RATING_VALUES.includes(value)) return jsonError("Unknown rating.", 400);

  if (!(await canInteractWithVideo(id, user))) {
    return jsonError("You can't rate this video.", 403);
  }

  const { counts, score } = await applyRating(id, user.id, value);
  return NextResponse.json({ ok: true, myRating: value, counts, score });
});

export const DELETE = withUser<Params>(async (user, _req, { params }) => {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
  if (!video) return jsonError("Video not found.", 404);
  const { counts, score } = await applyRating(id, user.id, null);
  return NextResponse.json({ ok: true, myRating: null, counts, score });
});
