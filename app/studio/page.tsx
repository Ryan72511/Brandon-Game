import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/data";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

// Creating-mode home: a little dashboard of how your videos are doing,
// plus the big Add button and your video list.
export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const [rows, totals, commentCount, topRow] = await Promise.all([
    prisma.video.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      // The stat tiles use an aggregate; the list itself is capped so a
      // prolific creator doesn't re-serialize their whole catalog each visit.
      take: 60,
    }),
    // One aggregate over all their videos — no per-video looping.
    prisma.video.aggregate({
      where: { creatorId: user.id },
      _sum: {
        viewCount: true,
        burntCount: true,
        poppedCount: true,
        butterCount: true,
      },
    }),
    prisma.comment.count({ where: { video: { creatorId: user.id } } }),
    // Their best published video with at least one rating.
    prisma.video.findFirst({
      where: {
        creatorId: user.id,
        status: "published",
        OR: [
          { burntCount: { gt: 0 } },
          { poppedCount: { gt: 0 } },
          { butterCount: { gt: 0 } },
        ],
      },
      orderBy: { popcornScore: "desc" },
      select: { id: true, popcornScore: true },
    }),
  ]);

  const videos = await getFeedVideos(
    rows.map((r) => r.id),
    user.id
  );

  const totalViews = totals._sum.viewCount ?? 0;
  const burnt = totals._sum.burntCount ?? 0;
  const popped = totals._sum.poppedCount ?? 0;
  const butter = totals._sum.butterCount ?? 0;
  const totalRatings = burnt + popped + butter;

  const topVideo = topRow ? videos.find((v) => v.id === topRow.id) : undefined;

  const stats = [
    { value: videos.length, label: "videos" },
    { value: totalViews, label: "views" },
    { value: totalRatings, label: "ratings" },
    { value: commentCount, label: "comments" },
  ];

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="🎬 Your studio" />

      <Link
        href="/studio/upload"
        className="flex min-h-20 items-center justify-center gap-3 rounded-xl bg-accent text-xl font-bold text-white shadow-card"
      >
        ＋ Add a video
      </Link>

      {/* How you're doing: totals across all their videos */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">How you&apos;re doing</h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-line bg-surface p-4 text-center shadow-card"
            >
              <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-[14px] text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[14px] text-ink-soft">
          Tap any video for its full analytics.
        </p>
      </section>

      {/* Audience love: how all their ratings split up */}
      {totalRatings > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="mb-3 font-bold">Audience love</p>
          <div className="flex h-4 w-full overflow-hidden rounded-full" aria-hidden>
            {butter > 0 && (
              <div
                className="bg-gold"
                style={{ width: `${(100 * butter) / totalRatings}%` }}
              />
            )}
            {popped > 0 && (
              <div
                className="bg-accent"
                style={{ width: `${(100 * popped) / totalRatings}%` }}
              />
            )}
            {burnt > 0 && (
              <div
                className="border border-line bg-surface-2"
                style={{ width: `${(100 * burnt) / totalRatings}%` }}
              />
            )}
          </div>
          <p className="mt-2 text-[14px] text-ink-soft">
            🧈 {butter.toLocaleString()} · 🍿 {popped.toLocaleString()} · 🌽{" "}
            {burnt.toLocaleString()}
          </p>
        </section>
      )}

      {/* Top video: their highest popcorn score */}
      {topRow && topVideo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">
            Your top video — {topRow.popcornScore}% popped
          </h2>
          <VideoCard
            id={topVideo.id}
            title={topVideo.title}
            thumb={topVideo.thumb}
            durationSec={topVideo.durationSec}
            score={topVideo.score}
            creatorName={`${topVideo.viewCount.toLocaleString()} views · ${topVideo.commentCount.toLocaleString()} comments`}
            href={`/studio/video/${topVideo.id}`}
          />
        </section>
      )}

      <Link
        href="/studio/profile"
        className="flex min-h-14 items-center justify-between rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <span className="font-semibold">✏️ Your creator page</span>
        <span className="text-xl text-ink-soft" aria-hidden>
          ›
        </span>
      </Link>

      <Link
        href="/studio/series"
        className="flex min-h-14 items-center justify-between rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <span className="font-semibold">Your mini-series</span>
        <span className="text-xl text-ink-soft" aria-hidden>
          ›
        </span>
      </Link>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-4xl" aria-hidden>
            🎥
          </p>
          <p className="mt-2 font-bold">Your first video starts here</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Gasp loves short, wide (16:9) videos — mini shows about a minute long. Tell
            people how you made it, too.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Your videos</h2>
          {videos.map((v) => (
            <div key={v.id} className="relative">
              {v.status !== "published" && (
                <span
                  className={`absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-[12px] font-bold ${
                    v.status === "removed"
                      ? "bg-accent text-white"
                      : "bg-gold text-[#1c1917]"
                  }`}
                >
                  {v.status === "draft"
                    ? "Draft"
                    : v.status === "pending"
                      ? "In review"
                      : "Removed"}
                </span>
              )}
              <VideoCard
                id={v.id}
                title={v.title}
                thumb={v.thumb}
                durationSec={v.durationSec}
                score={v.score}
                creatorName={`${v.viewCount} views · ${v.commentCount} comments`}
                href={`/studio/video/${v.id}`}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
