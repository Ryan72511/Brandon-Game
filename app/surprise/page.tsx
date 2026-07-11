import { getCurrentUser } from "@/lib/session";
import { surpriseMe } from "@/lib/recs";
import { getFeedVideos, getMyChannels } from "@/lib/data";
import WatchFeed from "@/components/watch/WatchFeed";

export const dynamic = "force-dynamic";

// Surprise Me — a fresh daily mix: mostly crowd-pleasers, with newcomers
// spliced in so new creators get discovered.
export default async function SurprisePage() {
  const user = await getCurrentUser();
  const ids = await surpriseMe(user?.id ?? null, 20);
  const [videos, channels] = await Promise.all([
    getFeedVideos(ids, user?.id ?? null),
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
      emptyMessage="The surprise machine is warming up — check back soon!"
    />
  );
}
