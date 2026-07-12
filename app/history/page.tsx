import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFeedVideos } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

// "Watched today" / "Watched yesterday" / "Watched N days ago" — calendar
// days, so something from late last night still reads as yesterday.
function watchedLabel(when: Date, now: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(when)) / 86400000);
  if (days <= 0) return "Watched today";
  if (days === 1) return "Watched yesterday";
  return `Watched ${days} days ago`;
}

// 102 -> "1:42", 42 -> "0:42"
function mmss(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/history");

  const events = await prisma.watchEvent.findMany({
    where: { userId: user.id },
    orderBy: { watchedAt: "desc" },
    take: 50,
    select: { videoId: true, progressSec: true, completed: true, watchedAt: true },
  });

  // Dedupe by video, keeping only the most recent watch of each.
  const latest = new Map<string, (typeof events)[number]>();
  for (const e of events) {
    if (!latest.has(e.videoId)) latest.set(e.videoId, e);
  }
  const ordered = [...latest.values()];

  // getFeedVideos hides removed/suspended/blocked/mature videos and may
  // reorder — re-sort back to most-recently-watched first.
  const videos = await getFeedVideos(
    ordered.map((e) => e.videoId),
    user.id
  );
  const byId = new Map(videos.map((v) => [v.id, v]));
  const rows = ordered
    .map((e) => ({ event: e, video: byId.get(e.videoId) }))
    .filter((r) => r.video !== undefined);

  const now = new Date();

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="Recently watched" backHref="/you" />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-ink-soft">
          Nothing here yet. Everything you watch shows up here so you can find it again.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ event, video }) => (
            <div key={event.videoId} className="flex flex-col gap-1.5">
              <VideoCard
                id={video!.id}
                title={video!.title}
                thumb={video!.thumb}
                durationSec={video!.durationSec}
                score={video!.score}
                creatorName={video!.creator.displayName}
              />
              <p className="px-1 text-[14px] text-ink-soft">
                {watchedLabel(event.watchedAt, now)}
                {" · "}
                {event.completed ? (
                  <span className="font-semibold text-accent">Finished ✓</span>
                ) : event.progressSec < 3 ? (
                  <>Just started</>
                ) : (
                  <>Stopped at {mmss(event.progressSec)}</>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
