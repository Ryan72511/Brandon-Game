import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { recommendForUser, surpriseMe } from "@/lib/recs";
import { getFeedVideos, getMyChannels } from "@/lib/data";
import WatchFeed from "@/components/watch/WatchFeed";

export const dynamic = "force-dynamic";

// Home = the watch feed. Signed in: personal recommendations. Signed out:
// the daily Surprise Me mix — watching needs no account.
export default async function HomePage() {
  const user = await getCurrentUser();

  // Continue watching: the latest unfinished videos lead the feed and
  // resume where they left off.
  let continueIds: string[] = [];
  if (user) {
    const recent = await prisma.watchEvent.findMany({
      where: {
        userId: user.id,
        completed: false,
        progressSec: { gt: 2 },
        watchedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      orderBy: { watchedAt: "desc" },
      select: { videoId: true },
      take: 20,
    });
    continueIds = [...new Set(recent.map((r) => r.videoId))].slice(0, 4);
  }

  const recs = user
    ? await recommendForUser(user.id, { limit: 20, excludeVideoIds: continueIds })
    : [];
  let ids = [...continueIds, ...recs.map((r) => r.id)];
  const reasons = new Map(recs.filter((r) => r.reason).map((r) => [r.id, r.reason]));
  if (ids.length === 0) ids = await surpriseMe(user?.id ?? null, 20);

  const [videos, channels] = await Promise.all([
    getFeedVideos(ids, user?.id ?? null, { reasons }),
    user ? getMyChannels(user.id) : Promise.resolve([]),
  ]);

  return (
    <WatchFeed
      videos={videos}
      signedIn={Boolean(user)}
      viewerUsername={user?.username ?? null}
      myChannels={channels.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        category: c.category,
        customCategory: c.customCategory,
        coverUrl: c.coverUrl,
      }))}
      emptyMessage="No videos yet — run the seed script, or be the first to add one!"
    />
  );
}
