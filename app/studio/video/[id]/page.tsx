import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseTags } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import SparkBars from "@/components/SparkBars";
import EditVideoForm from "@/components/EditVideoForm";
import DeleteVideoButton from "@/components/DeleteVideoButton";

export const dynamic = "force-dynamic";

// Per-video studio page: how it's doing, edit everything, delete at the
// bottom. Owner-only — anyone else bounces back to /studio.
export default async function StudioVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: { _count: { select: { comments: true } } },
  });
  if (!video || video.creatorId !== user.id) redirect("/studio");

  // Seven local-date buckets ending today, filled from the last week of
  // watch events.
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const [totalWatches, completedWatches, recentWatches] = await Promise.all([
    prisma.watchEvent.count({ where: { videoId: id } }),
    prisma.watchEvent.count({ where: { videoId: id, completed: true } }),
    prisma.watchEvent.findMany({
      where: { videoId: id, watchedAt: { gte: dayStart } },
      select: { watchedAt: true },
    }),
  ]);

  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const w of recentWatches) {
    const bucket = byKey.get(w.watchedAt.toDateString());
    if (bucket) bucket.count += 1;
  }

  const completionRate =
    totalWatches > 0 ? `${Math.round((100 * completedWatches) / totalWatches)}%` : "—";
  const isDraft = video.status === "draft";

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="Video details" backHref="/studio" />

      {/* Preview */}
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="relative aspect-video w-full bg-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="flex items-center gap-3 p-4">
          <h2 className="flex-1 text-lg font-bold">{video.title}</h2>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold ${
              isDraft ? "bg-gold text-[#1c1917]" : "border border-line bg-surface text-ink-soft"
            }`}
          >
            {isDraft ? "Draft" : "Published"}
          </span>
        </div>
      </section>

      {/* Analytics */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">How it&apos;s doing</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
            <p className="text-3xl font-bold">{video.viewCount}</p>
            <p className="text-[14px] text-ink-soft">views</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
            <p className="text-3xl font-bold">{completionRate}</p>
            <p className="text-[14px] text-ink-soft">watched to the end</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
            <p className="text-3xl font-bold">{video._count.comments}</p>
            <p className="text-[14px] text-ink-soft">comments</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
            <p className="text-3xl font-bold">{video.popcornScore}</p>
            <p className="text-[14px] text-ink-soft">popcorn score</p>
          </div>
        </div>
        <div className="flex items-center justify-around rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="text-center">
            <p className="text-xl font-bold">{video.burntCount}</p>
            <p className="text-[13px] text-ink-soft">🌽 Unpopped</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{video.poppedCount}</p>
            <p className="text-[13px] text-ink-soft">🍿 Popped</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{video.butterCount}</p>
            <p className="text-[13px] text-ink-soft">🧈 Extra Butter</p>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="mb-3 font-bold">Views this week</p>
          <SparkBars values={days.map((d) => d.count)} labels={days.map((d) => d.label)} />
        </div>
      </section>

      {/* Edit */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Edit details</h2>
        <EditVideoForm
          video={{
            id: video.id,
            title: video.title,
            description: video.description,
            backstory: video.backstory,
            category: video.category,
            tags: parseTags(video.tags).join(", "),
            status: video.status,
            captionsVtt: video.captionsVtt,
          }}
        />
      </section>

      <DeleteVideoButton videoId={video.id} />
    </div>
  );
}
