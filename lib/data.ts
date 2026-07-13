// Query helpers that shape Prisma rows into the DTOs client components use.
import { prisma } from "@/lib/db";
import { scoreDisplay, popcornScore, type ScoreDisplay } from "@/lib/score";
import { parseTags } from "@/lib/format";
import { isPublicVideo, publicVideoWhere } from "@/lib/visibility";
import { isAdult } from "@/lib/age";

// Recompute a video's denormalized rating counters + Popcorn Score from the
// source-of-truth Rating rows. The rate route does this transactionally on
// each vote, but cascade deletes (e.g. deleting a user removes their ratings
// on OTHER people's videos) bypass that path and would otherwise leave those
// videos permanently over-counted. Call this for each affected video after
// such a delete. Best-effort: a since-deleted video id is simply skipped.
export async function recomputeVideoCounters(videoId: string): Promise<void> {
  const grouped = await prisma.rating.groupBy({
    by: ["value"],
    where: { videoId },
    _count: true,
  });
  const counts = { burnt: 0, popped: 0, butter: 0 };
  for (const g of grouped) {
    if (g.value in counts) counts[g.value as keyof typeof counts] = g._count;
  }
  await prisma.video
    .update({
      where: { id: videoId },
      data: {
        burntCount: counts.burnt,
        poppedCount: counts.popped,
        butterCount: counts.butter,
        popcornScore: popcornScore(counts),
      },
    })
    .catch(() => {});
}

// Whether `user` may interact with a video (rate / comment / record a view) —
// the same rule as "can watch it": published, creator in good standing, and
// mature-gated, with the owner always allowed on their own video. Prevents
// seeding ratings/comments/views onto drafts, removed, or mature content by id.
export async function canInteractWithVideo(
  videoId: string,
  user: { id: string; birthYear: number | null } | null
): Promise<boolean> {
  const v = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      creatorId: true,
      status: true,
      publishAt: true,
      mature: true,
      creator: { select: { suspended: true } },
    },
  });
  if (!v) return false;
  if (user && user.id === v.creatorId) return true;
  if (!isPublicVideo(v) || v.creator.suspended) return false;
  if (v.mature && !isAdult(user?.birthYear)) return false;
  return true;
}

export interface FeedVideo {
  id: string;
  title: string;
  description: string;
  backstory: string;
  src: string;
  thumb: string;
  durationSec: number;
  category: string;
  tags: string[];
  createdAt: string;
  viewCount: number;
  commentCount: number;
  commentTimecodes: number[]; // tick marks on the scrubber
  score: ScoreDisplay;
  creator: {
    username: string;
    displayName: string;
    avatarEmoji: string;
    avatarColor: string;
  };
  series: { id: string; title: string } | null;
  episodeNumber: number | null;
  nextEpisodeId: string | null;
  myRating: string | null; // "burnt" | "popped" | "butter" | null
  savedInChannelIds: string[]; // current user's channels containing this video
  captionsVtt: string;
  status: string; // "draft" | "pending" | "published" | "removed"
  mature: boolean;
  // Why this video was recommended, when it came from the recommender.
  reason?: string;
  // Resume position for the current user (Continue Watching).
  resumeAtSec?: number;
}

const feedInclude = {
  creator: {
    select: {
      username: true,
      displayName: true,
      avatarEmoji: true,
      avatarColor: true,
      suspended: true,
    },
  },
  series: { select: { id: true, title: true } },
  comments: {
    select: { timecodeSec: true },
    where: { timecodeSec: { not: null } },
    take: 100,
  },
  _count: { select: { comments: true } },
} as const;

type FeedRow = NonNullable<
  Awaited<ReturnType<typeof prisma.video.findFirst<{ include: typeof feedInclude }>>>
>;

export async function getFeedVideos(
  videoIds: string[],
  currentUserId: string | null,
  opts: { reasons?: Map<string, string> } = {}
): Promise<FeedVideo[]> {
  if (videoIds.length === 0) return [];
  // Only confirmed adults see mature content (signed-out = not adult).
  const viewer = currentUserId
    ? await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { birthYear: true },
      })
    : null;
  const canSeeMature = isAdult(viewer?.birthYear);
  const [videos, myRatings, mySaves, nextEpisodes, progress, myBlocks] = await Promise.all([
    prisma.video.findMany({ where: { id: { in: videoIds } }, include: feedInclude }),
    currentUserId
      ? prisma.rating.findMany({
          where: { userId: currentUserId, videoId: { in: videoIds } },
          select: { videoId: true, value: true },
        })
      : Promise.resolve([]),
    currentUserId
      ? prisma.channelVideo.findMany({
          where: { videoId: { in: videoIds }, channel: { ownerId: currentUserId } },
          select: { videoId: true, channelId: true },
        })
      : Promise.resolve([]),
    // Next-episode lookup, batched: one query for every involved series.
    (async () => {
      const withSeries = await prisma.video.findMany({
        where: { id: { in: videoIds }, seriesId: { not: null } },
        select: { id: true, seriesId: true, episodeNumber: true },
      });
      if (withSeries.length === 0) return new Map<string, string | null>();
      const seriesIds = [...new Set(withSeries.map((v) => v.seriesId!))];
      // Next-episode must obey full visibility, not just status: a scheduled,
      // suspended-creator, or (for non-adults) mature next episode must not
      // produce a "Next ▶" button that dead-ends on the guarded watch page.
      // Same-series ⇒ same creator, so block-filtering is already covered.
      const episodes = await prisma.video.findMany({
        where: {
          seriesId: { in: seriesIds },
          ...publicVideoWhere(),
          ...(canSeeMature ? {} : { mature: false }),
        },
        orderBy: { episodeNumber: "asc" },
        select: { id: true, seriesId: true, episodeNumber: true },
      });
      const bySeries = new Map<string, { id: string; episodeNumber: number | null }[]>();
      for (const e of episodes) {
        bySeries.set(e.seriesId!, [...(bySeries.get(e.seriesId!) ?? []), e]);
      }
      return new Map(
        withSeries.map((v) => {
          const next = (bySeries.get(v.seriesId!) ?? []).find(
            (e) => (e.episodeNumber ?? 0) > (v.episodeNumber ?? 0)
          );
          return [v.id, next?.id ?? null] as const;
        })
      );
    })(),
    // Latest watch progress per video for resume.
    currentUserId
      ? prisma.watchEvent.findMany({
          where: { userId: currentUserId, videoId: { in: videoIds } },
          orderBy: { watchedAt: "desc" },
          select: { videoId: true, progressSec: true, completed: true },
        })
      : Promise.resolve([]),
    currentUserId
      ? prisma.block.findMany({
          where: { blockerId: currentUserId },
          select: { blockedId: true },
        })
      : Promise.resolve([]),
  ]);
  const blockedIds = new Set(myBlocks.map((b) => b.blockedId));

  // The LATEST event per video decides: if they finished it last time,
  // there's nothing to resume — older half-watched events don't count.
  const progressMap = new Map<string, number>();
  const decided = new Set<string>();
  for (const p of progress) {
    if (decided.has(p.videoId)) continue;
    decided.add(p.videoId);
    if (!p.completed && p.progressSec > 2) {
      progressMap.set(p.videoId, p.progressSec);
    }
  }

  const ratingMap = new Map(myRatings.map((r) => [r.videoId, r.value]));
  const savesMap = new Map<string, string[]>();
  for (const s of mySaves) {
    savesMap.set(s.videoId, [...(savesMap.get(s.videoId) ?? []), s.channelId]);
  }

  const byId = new Map(videos.map((v) => [v.id, v]));
  // Preserve the caller's ordering (recs/charts order matters). Drafts and
  // scheduled videos are visible only to their creator, and videos from
  // creators this viewer blocked disappear entirely.
  return videoIds
    .map((id) => byId.get(id))
    .filter((v): v is FeedRow => Boolean(v))
    // Suspended-creator videos vanish for everyone but that creator; this
    // is the single defense covering every feed caller (?ch, series, recs).
    .filter((v) => (!v.creator.suspended && isPublicVideo(v)) || v.creatorId === currentUserId)
    .filter((v) => !blockedIds.has(v.creatorId))
    // Mature videos only reach confirmed adults (the creator always sees
    // their own). Kids and signed-out viewers never do.
    .filter((v) => !v.mature || canSeeMature || v.creatorId === currentUserId)
    .map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      backstory: v.backstory,
      src: v.src,
      thumb: v.thumb,
      durationSec: v.durationSec,
      category: v.category,
      tags: parseTags(v.tags),
      createdAt: v.createdAt.toISOString(),
      viewCount: v.viewCount,
      commentCount: v._count.comments,
      commentTimecodes: v.comments
        .map((c) => c.timecodeSec)
        .filter((t): t is number => t !== null),
      score: scoreDisplay(
        { burnt: v.burntCount, popped: v.poppedCount, butter: v.butterCount },
        v.popcornScore
      ),
      creator: {
        username: v.creator.username,
        displayName: v.creator.displayName,
        avatarEmoji: v.creator.avatarEmoji,
        avatarColor: v.creator.avatarColor,
      },
      series: v.series,
      episodeNumber: v.episodeNumber,
      nextEpisodeId: nextEpisodes.get(v.id) ?? null,
      myRating: ratingMap.get(v.id) ?? null,
      savedInChannelIds: savesMap.get(v.id) ?? [],
      captionsVtt: v.captionsVtt,
      status: v.status,
      mature: v.mature,
      reason: opts.reasons?.get(v.id),
      resumeAtSec: progressMap.get(v.id),
    }));
}

export async function getMyChannels(userId: string) {
  return prisma.channel.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { videos: true, followers: true } } },
  });
}
