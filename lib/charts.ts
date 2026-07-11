// Top-rated charts, computed on demand with a short in-process cache.
// At scale this becomes a precomputed ChartEntry table refreshed by a job
// (see docs/ARCHITECTURE.md) — the page reads the same shape either way.
import { prisma } from "@/lib/db";
import {
  SCORE_PRIOR_MEAN,
  SCORE_PRIOR_WEIGHT_WEEKLY,
  SCORE_PRIOR_WEIGHT_ALL_TIME,
} from "@/lib/constants";
import { publicVideoWhere } from "@/lib/visibility";

export interface ChartRow {
  videoId: string;
  score: number; // smoothed % popped for the period
  ratings: number; // rating count in the period
}

const CACHE_TTL_MS = 60_000;
const cacheStore = new Map<string, { at: number; rows: ChartRow[] }>();

const MIN_WEEKLY_RATINGS = 3;
const MIN_ALL_TIME_RATINGS = 5;

async function computeWeekly(limit: number): Promise<ChartRow[]> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const ratings = await prisma.rating.findMany({
    where: { createdAt: { gte: since }, video: publicVideoWhere() },
    select: { videoId: true, value: true },
  });
  const byVideo = new Map<string, { fresh: number; total: number }>();
  for (const r of ratings) {
    const entry = byVideo.get(r.videoId) ?? { fresh: 0, total: 0 };
    entry.total++;
    if (r.value === "popped" || r.value === "butter") entry.fresh++;
    byVideo.set(r.videoId, entry);
  }
  const m = SCORE_PRIOR_WEIGHT_WEEKLY;
  return [...byVideo.entries()]
    .filter(([, c]) => c.total >= MIN_WEEKLY_RATINGS)
    .map(([videoId, c]) => ({
      videoId,
      score: Math.round((100 * (c.fresh + m * SCORE_PRIOR_MEAN)) / (c.total + m)),
      ratings: c.total,
    }))
    .sort((a, b) => b.score - a.score || b.ratings - a.ratings)
    .slice(0, limit);
}

async function computeAllTime(limit: number): Promise<ChartRow[]> {
  // Over-fetch generously: the min-ratings filter runs after this cut, and
  // high-score/low-rating videos would otherwise crowd out qualifiers.
  const videos = await prisma.video.findMany({
    where: publicVideoWhere(),
    select: { id: true, popcornScore: true, burntCount: true, poppedCount: true, butterCount: true },
    orderBy: { popcornScore: "desc" },
    take: limit * 25,
  });
  return videos
    .map((v) => ({
      videoId: v.id,
      score: v.popcornScore,
      ratings: v.burntCount + v.poppedCount + v.butterCount,
    }))
    .filter((v) => v.ratings >= MIN_ALL_TIME_RATINGS)
    .sort((a, b) => b.score - a.score || b.ratings - a.ratings)
    .slice(0, limit);
}

export async function getChart(period: "weekly" | "alltime", limit = 20): Promise<ChartRow[]> {
  const key = `${period}:${limit}`;
  const hit = cacheStore.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;
  const rows = period === "weekly" ? await computeWeekly(limit) : await computeAllTime(limit);
  cacheStore.set(key, { at: Date.now(), rows });
  return rows;
}

export { SCORE_PRIOR_WEIGHT_ALL_TIME };
