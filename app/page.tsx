import { getCurrentUser } from "@/lib/session";
import { recommendForUser, surpriseMe } from "@/lib/recs";
import { getFeedVideos, getMyChannels } from "@/lib/data";
import WatchFeed from "@/components/watch/WatchFeed";

export const dynamic = "force-dynamic";

// Home = the watch feed. Signed in: personal recommendations. Signed out:
// the daily Surprise Me mix — watching needs no account.
export default async function HomePage() {
  const user = await getCurrentUser();
  let ids = user ? await recommendForUser(user.id, { limit: 20 }) : await surpriseMe(null, 20);
  if (ids.length === 0) ids = await surpriseMe(user?.id ?? null, 20);

  const [videos, channels] = await Promise.all([
    getFeedVideos(ids, user?.id ?? null),
    user ? getMyChannels(user.id) : Promise.resolve([]),
  ]);

  return (
    <WatchFeed
      videos={videos}
      signedIn={Boolean(user)}
      myChannels={channels.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))}
      emptyMessage="No videos yet — run the seed script, or be the first to add one!"
    />
  );
}
