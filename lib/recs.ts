// Deterministic content-based recommendations. No ML — a taste vector of
// category/tag weights scored against candidate videos. Fine to ~50k videos;
// the production swap (pgvector embeddings + ANN) keeps this interface.
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/format";

type CandidateVideo = {
  id: string;
  category: string;
  tags: string;
  popcornScore: number;
  viewCount: number;
  createdAt: Date;
};

const SAVE_WEIGHT = 3;
const LOVE_WEIGHT = 2; // rated popped/butter
const WATCH_WEIGHT = 1;
const CANDIDATE_CAP = 2000;

// FNV-1a — a tiny deterministic hash for the daily Surprise Me shuffle seed.
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function addSignal(taste: Map<string, number>, video: { category: string; tags: string }, weight: number) {
  taste.set(video.category, (taste.get(video.category) ?? 0) + weight);
  for (const tag of parseTags(video.tags)) {
    taste.set(tag, (taste.get(tag) ?? 0) + weight);
  }
}

// Build the user's taste vector from saves (strongest), positive ratings,
// and watches (weakest).
export async function buildTasteVector(userId: string): Promise<Map<string, number>> {
  const taste = new Map<string, number>();
  const [saves, loves, watches] = await Promise.all([
    prisma.channelVideo.findMany({
      where: { channel: { ownerId: userId } },
      include: { video: { select: { category: true, tags: true } } },
      orderBy: { addedAt: "desc" },
      take: 200,
    }),
    prisma.rating.findMany({
      where: { userId, value: { in: ["popped", "butter"] } },
      include: { video: { select: { category: true, tags: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.watchEvent.findMany({
      where: { userId },
      include: { video: { select: { category: true, tags: true } } },
      orderBy: { watchedAt: "desc" },
      take: 200,
    }),
  ]);
  for (const s of saves) addSignal(taste, s.video, SAVE_WEIGHT);
  for (const l of loves) addSignal(taste, l.video, LOVE_WEIGHT);
  for (const w of watches) addSignal(taste, w.video, WATCH_WEIGHT);
  return taste;
}

// Taste vector for a channel: what's already saved in it defines it.
export async function buildChannelTasteVector(channelId: string): Promise<Map<string, number>> {
  const taste = new Map<string, number>();
  const items = await prisma.channelVideo.findMany({
    where: { channelId },
    include: { video: { select: { category: true, tags: true } } },
    take: 200,
  });
  for (const item of items) addSignal(taste, item.video, 1);
  return taste;
}

function scoreCandidate(taste: Map<string, number>, v: CandidateVideo, now: number): number {
  const tags = parseTags(v.tags);
  let overlap = taste.get(v.category) ?? 0;
  for (const t of tags) overlap += taste.get(t) ?? 0;
  const tasteScore = overlap / Math.sqrt(1 + tags.length);
  const quality = 1.5 * (v.popcornScore / 100);
  const popularity = 0.5 * Math.log10(1 + v.viewCount);
  const freshBoost = now - v.createdAt.getTime() < 7 * 24 * 3600 * 1000 ? 0.75 : 0;
  return tasteScore + quality + popularity + freshBoost;
}

export async function recommendForUser(
  userId: string | null,
  opts: { excludeVideoIds?: string[]; limit?: number } = {}
): Promise<string[]> {
  const limit = opts.limit ?? 20;
  const taste = userId ? await buildTasteVector(userId) : new Map<string, number>();

  const recentlyWatched = userId
    ? await prisma.watchEvent.findMany({
        where: { userId, watchedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
        select: { videoId: true },
      })
    : [];
  const exclude = new Set([
    ...(opts.excludeVideoIds ?? []),
    ...recentlyWatched.map((w) => w.videoId),
  ]);

  const candidates = await prisma.video.findMany({
    select: { id: true, category: true, tags: true, popcornScore: true, viewCount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_CAP,
  });

  const now = Date.now();
  const scored = candidates
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({ id: c.id, score: scoreCandidate(taste, c, now) }))
    .sort((a, b) => b.score - a.score);

  // If excluding watched videos leaves too few, backfill with watched ones —
  // an empty feed is worse than a rewatch.
  const ids = scored.slice(0, limit).map((s) => s.id);
  if (ids.length < limit) {
    const backfill = candidates
      .filter((c) => !ids.includes(c.id) && !(opts.excludeVideoIds ?? []).includes(c.id))
      .map((c) => ({ id: c.id, score: scoreCandidate(taste, c, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit - ids.length)
      .map((s) => s.id);
    ids.push(...backfill);
  }
  return ids;
}

// Recommendations to grow a channel: same scorer, channel-derived taste,
// excluding what's already in the channel.
export async function recommendForChannel(channelId: string, limit = 12): Promise<string[]> {
  const [taste, existing] = await Promise.all([
    buildChannelTasteVector(channelId),
    prisma.channelVideo.findMany({ where: { channelId }, select: { videoId: true } }),
  ]);
  const exclude = new Set(existing.map((e) => e.videoId));
  const candidates = await prisma.video.findMany({
    select: { id: true, category: true, tags: true, popcornScore: true, viewCount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_CAP,
  });
  const now = Date.now();
  return candidates
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({ id: c.id, score: scoreCandidate(taste, c, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.id);
}

// Surprise Me: deterministic for (user, day) — same list on refresh, fresh
// tomorrow. Quality pool shuffled, with a recent-upload spliced into every
// 5th slot so new creators get seen.
export async function surpriseMe(userId: string | null, limit = 20): Promise<string[]> {
  const day = new Date().toISOString().slice(0, 10);
  const seed = fnv1a(`${userId ?? "anon"}:${day}`);

  const [quality, fresh] = await Promise.all([
    prisma.video.findMany({
      where: { popcornScore: { gte: 55 } },
      select: { id: true },
      orderBy: { popcornScore: "desc" },
      take: 200,
    }),
    prisma.video.findMany({
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const shuffledQuality = seededShuffle(quality.map((v) => v.id), seed);
  const shuffledFresh = seededShuffle(
    fresh.map((v) => v.id).filter((id) => !shuffledQuality.slice(0, limit).includes(id)),
    seed ^ 0x9e3779b9
  );

  const out: string[] = [];
  let qi = 0;
  let fi = 0;
  while (out.length < limit && (qi < shuffledQuality.length || fi < shuffledFresh.length)) {
    const wantFresh = out.length % 5 === 4;
    const next =
      wantFresh && fi < shuffledFresh.length
        ? shuffledFresh[fi++]
        : qi < shuffledQuality.length
          ? shuffledQuality[qi++]
          : shuffledFresh[fi++];
    if (next && !out.includes(next)) out.push(next);
  }
  return out;
}
