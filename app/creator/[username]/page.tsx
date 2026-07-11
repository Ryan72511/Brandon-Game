import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/data";
import { parseTags } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import VideoCard from "@/components/VideoCard";
import ChannelTile from "@/components/ChannelTile";

export const dynamic = "force-dynamic";

// The creator page — where we celebrate the maker: who they are, how they
// work, what they've made.
export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getCurrentUser();

  const creator = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      series: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { videos: true } } },
      },
      channels: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { videos: true } } },
      },
    },
  });
  if (!creator) notFound();

  const videoRows = await prisma.video.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    take: 50,
  });
  const videos = await getFeedVideos(
    videoRows.map((v) => v.id),
    viewer?.id ?? null
  );
  const tools = parseTags(creator.creatorTools);
  const isSelf = viewer?.id === creator.id;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader title={creator.displayName} backHref="/" />

      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-4">
          <Avatar emoji={creator.avatarEmoji} color={creator.avatarColor} size={72} />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">{creator.displayName}</h2>
            <p className="text-ink-soft">@{creator.username}</p>
            {creator.bio && <p className="mt-1">{creator.bio}</p>}
          </div>
        </div>
        {isSelf && (
          <Link
            href="/studio/profile"
            className="min-h-12 rounded-xl border-2 border-line bg-surface px-4 py-3 text-center font-bold"
          >
            ✏️ Edit your creator page
          </Link>
        )}

        {creator.creatorAbout && (
          <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h3 className="mb-1 font-bold">About this creator</h3>
            <p className="whitespace-pre-wrap text-ink-soft">{creator.creatorAbout}</p>
          </section>
        )}

        {(tools.length > 0 || creator.creatorProcess) && (
          <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h3 className="mb-2 font-bold">How they make it</h3>
            {tools.length > 0 && (
              <p className="mb-2 flex flex-wrap gap-2">
                {tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gold-soft px-3 py-1 text-[14px] font-semibold"
                  >
                    🛠 {t}
                  </span>
                ))}
              </p>
            )}
            {creator.creatorProcess && (
              <p className="whitespace-pre-wrap text-ink-soft">{creator.creatorProcess}</p>
            )}
          </section>
        )}
      </div>

      {creator.series.length > 0 && (
        <section className="flex flex-col gap-3 px-4">
          <h3 className="text-lg font-bold">Mini-series</h3>
          {creator.series
            .filter((s) => s._count.videos > 0)
            .map((s) => {
              // Episode 1, not the newest upload — `videos` is recency-ordered.
              const first = videos
                .filter((v) => v.series?.id === s.id)
                .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))[0];
              return (
                <Link
                  key={s.id}
                  href={first ? `/watch/${first.id}?series=${s.id}` : "#"}
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
                >
                  <span className="text-2xl" aria-hidden>
                    🎬
                  </span>
                  <span className="flex-1 font-bold">{s.title}</span>
                  <span className="text-[14px] text-ink-soft">
                    {s._count.videos} episodes ▶
                  </span>
                </Link>
              );
            })}
        </section>
      )}

      <section className="flex flex-col gap-3 px-4">
        <h3 className="text-lg font-bold">
          {videos.length === 0 ? "No videos yet" : `Videos (${videos.length})`}
        </h3>
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            thumb={v.thumb}
            durationSec={v.durationSec}
            score={v.score}
          />
        ))}
      </section>

      {creator.channels.filter((c) => c._count.videos > 0).length > 0 && (
        <section className="flex flex-col gap-3 px-4">
          <h3 className="text-lg font-bold">Their channels</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {creator.channels
              .filter((c) => c._count.videos > 0)
              .map((c) => (
                <ChannelTile
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  emoji={c.emoji}
                  category={c.category}
                  customCategory={c.customCategory}
                  coverUrl={c.coverUrl}
                  caption={`${c._count.videos} ${c._count.videos === 1 ? "video" : "videos"}`}
                  onLight
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
