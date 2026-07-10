import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/data";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

// Creating-mode home: your videos, their scores, and the big Add button.
export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const rows = await prisma.video.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const videos = await getFeedVideos(
    rows.map((r) => r.id),
    user.id
  );
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="🎬 Your studio" />

      <Link
        href="/studio/upload"
        className="flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-accent text-xl font-bold text-white shadow-card"
      >
        ＋ Add a video
      </Link>

      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl border border-line bg-surface p-4 text-center shadow-card">
          <p className="text-3xl font-bold">{videos.length}</p>
          <p className="text-[14px] text-ink-soft">videos</p>
        </div>
        <div className="flex-1 rounded-2xl border border-line bg-surface p-4 text-center shadow-card">
          <p className="text-3xl font-bold">{totalViews}</p>
          <p className="text-[14px] text-ink-soft">views</p>
        </div>
        <Link
          href="/studio/profile"
          className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-4 text-center shadow-card"
        >
          <p className="text-3xl" aria-hidden>
            ✏️
          </p>
          <p className="text-[14px] font-semibold text-ink-soft">Creator page</p>
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-4xl" aria-hidden>
            🎥
          </p>
          <p className="mt-2 font-bold">Your first video starts here</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Reely loves short, wide (16:9) videos — mini shows about a minute long. Tell
            people how you made it, too.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Your videos</h2>
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumb={v.thumb}
              durationSec={v.durationSec}
              score={v.score}
              creatorName={`${v.viewCount} views · ${v.commentCount} comments`}
            />
          ))}
        </section>
      )}
    </div>
  );
}
