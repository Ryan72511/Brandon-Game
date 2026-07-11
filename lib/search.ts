// Shared search query logic used by /search (server page) and /api/search.
import { prisma } from "@/lib/db";
import { publicVideoWhere } from "@/lib/visibility";
import { scoreDisplay, type ScoreDisplay } from "@/lib/score";

export const SEARCH_MIN_LEN = 2;
export const SEARCH_MAX_LEN = 60;

export interface SearchVideo {
  id: string;
  title: string;
  thumb: string;
  durationSec: number;
  creatorName: string;
  score: ScoreDisplay;
}

export interface SearchCreator {
  username: string;
  displayName: string;
  avatarEmoji: string;
  avatarColor: string;
  bio: string;
}

export interface SearchChannel {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  customCategory: string;
  coverUrl: string;
  videoCount: number;
}

export interface SearchResults {
  videos: SearchVideo[];
  creators: SearchCreator[];
  channels: SearchChannel[];
}

export const EMPTY_RESULTS: SearchResults = { videos: [], creators: [], channels: [] };

// Trim and validate a raw ?q= value; returns "" when it's not searchable.
export function normalizeQuery(raw: string | null | undefined): string {
  const q = (raw ?? "").trim();
  return q.length >= SEARCH_MIN_LEN && q.length <= SEARCH_MAX_LEN ? q : "";
}

export async function searchAll(q: string): Promise<SearchResults> {
  if (!q) return EMPTY_RESULTS;

  // SQLite's LIKE is case-insensitive for ASCII but Prisma doesn't guarantee
  // it across providers, so query both the raw text and its lowercase form.
  // A single OR per model keeps results naturally deduped.
  const variants = [...new Set([q, q.toLowerCase()])];

  const videoOr = variants.flatMap((v) => [
    { title: { contains: v } },
    { description: { contains: v } },
    { tags: { contains: v } },
  ]);
  const creatorOr = variants.flatMap((v) => [
    { username: { contains: v } },
    { displayName: { contains: v } },
  ]);
  const channelOr = variants.map((v) => ({ name: { contains: v } }));

  const [videos, creators, channels] = await Promise.all([
    prisma.video.findMany({
      // AND keeps publicVideoWhere's own OR (publishAt) separate from ours.
      where: { AND: [publicVideoWhere(), { OR: videoOr }] },
      orderBy: [{ popcornScore: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        thumb: true,
        durationSec: true,
        burntCount: true,
        poppedCount: true,
        butterCount: true,
        popcornScore: true,
        creator: { select: { displayName: true } },
      },
    }),
    prisma.user.findMany({
      where: { OR: creatorOr },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        username: true,
        displayName: true,
        avatarEmoji: true,
        avatarColor: true,
        bio: true,
      },
    }),
    prisma.channel.findMany({
      where: { OR: channelOr },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        slug: true,
        name: true,
        emoji: true,
        category: true,
        customCategory: true,
        coverUrl: true,
        _count: { select: { videos: true } },
      },
    }),
  ]);

  return {
    videos: videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumb: v.thumb,
      durationSec: v.durationSec,
      creatorName: v.creator.displayName,
      score: scoreDisplay(
        { burnt: v.burntCount, popped: v.poppedCount, butter: v.butterCount },
        v.popcornScore
      ),
    })),
    creators,
    channels: channels.map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      category: c.category,
      customCategory: c.customCategory,
      coverUrl: c.coverUrl,
      videoCount: c._count.videos,
    })),
  };
}
