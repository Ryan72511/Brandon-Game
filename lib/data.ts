// Query helpers that shape Prisma rows into the DTOs client components use.
import { prisma } from "@/lib/db";
import { scoreDisplay, type ScoreDisplay } from "@/lib/score";
import { parseTags } from "@/lib/format";

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
  currentUserId: string | null
): Promise<FeedVideo[]> {
  if (videoIds.length === 0) return [];
  const [videos, myRatings, mySaves, nextEpisodes] = await Promise.all([
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
    (async () => {
      const withSeries = await prisma.video.findMany({
        where: { id: { in: videoIds }, seriesId: { not: null } },
        select: { id: true, seriesId: true, episodeNumber: true },
      });
      const pairs = await Promise.all(
        withSeries.map(async (v) => {
          const next = await prisma.video.findFirst({
            where: { seriesId: v.seriesId, episodeNumber: { gt: v.episodeNumber ?? 0 } },
            orderBy: { episodeNumber: "asc" },
            select: { id: true },
          });
          return [v.id, next?.id ?? null] as const;
        })
      );
      return new Map(pairs);
    })(),
  ]);

  const ratingMap = new Map(myRatings.map((r) => [r.videoId, r.value]));
  const savesMap = new Map<string, string[]>();
  for (const s of mySaves) {
    savesMap.set(s.videoId, [...(savesMap.get(s.videoId) ?? []), s.channelId]);
  }

  const byId = new Map(videos.map((v) => [v.id, v]));
  // Preserve the caller's ordering (recs/charts order matters).
  return videoIds
    .map((id) => byId.get(id))
    .filter((v): v is FeedRow => Boolean(v))
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
    }));
}

export async function getMyChannels(userId: string) {
  return prisma.channel.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { videos: true, followers: true } } },
  });
}
