import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFeedVideos } from "@/lib/data";
import type { FeedVideo } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

export default async function RatingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ratings");

  const ratings = await prisma.rating.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { videoId: true, value: true, createdAt: true },
  });

  // One visibility-filtered fetch for every rated video; getFeedVideos may
  // reorder, so we render from this map in our own newest-first order.
  const videos = await getFeedVideos(
    ratings.map((r) => r.videoId),
    user.id
  );
  const byId = new Map(videos.map((v) => [v.id, v]));

  const pick = (value: string): FeedVideo[] =>
    ratings
      .filter((r) => r.value === value)
      .map((r) => byId.get(r.videoId))
      .filter((v): v is FeedVideo => v !== undefined);

  const sections = [
    { key: "butter", heading: "🧈 Extra Butter — loved these", videos: pick("butter") },
    { key: "popped", heading: "🍿 Popped — liked these", videos: pick("popped") },
    { key: "burnt", heading: "🌽 Unpopped — not for you", videos: pick("burnt") },
  ].filter((s) => s.videos.length > 0);

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="Your ratings" backHref="/you" />

      {sections.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-ink-soft">
          You haven&apos;t rated anything yet. Tap Pop it under any video to rate it.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-3">
            <h2 className="px-1 text-lg font-bold">
              {section.heading}{" "}
              <span className="font-semibold text-gold">({section.videos.length})</span>
            </h2>
            {section.videos.map((v) => (
              <VideoCard
                key={v.id}
                id={v.id}
                title={v.title}
                thumb={v.thumb}
                durationSec={v.durationSec}
                score={v.score}
                creatorName={v.creator.displayName}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
