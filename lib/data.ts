// Query helpers that shape Prisma rows into the DTOs client components use.
import { prisma } from "@/lib/db";
import { scoreDisplay, type ScoreDisplay } from "@/lib/score";
import { parseTags } from "@/lib/format";
import { isPublicVideo } from "@/lib/visibility";

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
  status: string; // "draft" | "published"
  // Why this video was recommended, when it came from the recommender.
  reason?: string;
  // Resume position for the current user (Continue Watching).
  resumeAtSec?: number;
}

const feedInclude = {
  creator: {
    select: { username: true, displayName: true, avatarEmoji: true, avatarColor: true },
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
  const [videos, myRatings, mySaves, nextEpisodes, progress] = await Promise.all([
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
      const episodes = await prisma.video.findMany({
        where: { seriesId: { in: seriesIds }, status: "published" },
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
  ]);

  const progressMap = new Map<string, number>();
  for (const p of progress) {
    // First row per video wins (desc order) — resume only mid-video.
    if (!progressMap.has(p.videoId) && !p.completed && p.progressSec > 2) {
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
  // scheduled videos are visible only to their creator.
  return videoIds
    .map((id) => byId.get(id))
    .filter((v): v is FeedRow => Boolean(v))
    .filter((v) => isPublicVideo(v) || v.creatorId === currentUserId)
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
      creator: v.creator,
      series: v.series,
      episodeNumber: v.episodeNumber,
      nextEpisodeId: nextEpisodes.get(v.id) ?? null,
      myRating: ratingMap.get(v.id) ?? null,
      savedInChannelIds: savesMap.get(v.id) ?? [],
      captionsVtt: v.captionsVtt,
      status: v.status,
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
