import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/data";
import { publicVideoWhere } from "@/lib/visibility";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import VideoCard from "@/components/VideoCard";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

// One mini-series: what it is, who made it, follow it, and watch it in order.
export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();

  const series = await prisma.series.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarEmoji: true,
          avatarColor: true,
          suspended: true,
        },
      },
      _count: { select: { followers: true } },
    },
  });
  if (!series) notFound();
  const isOwner = viewer?.id === series.creator.id;
  // A suspended creator's series is gone for everyone but themselves.
  if (series.creator.suspended && !isOwner) notFound();

  // Owner sees drafts/scheduled; everyone else sees public episodes only.
  const episodeRows = await prisma.video.findMany({
    where: { seriesId: id, ...(isOwner ? {} : publicVideoWhere()) },
    orderBy: { episodeNumber: "asc" },
    select: { id: true },
  });
  // getFeedVideos is the visibility boundary (mature/blocked/suspended) but may
  // reorder — re-sort back to episode order for a coherent binge.
  const episodes = (
    await getFeedVideos(
      episodeRows.map((e) => e.id),
      viewer?.id ?? null
    )
  ).sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));

  if (episodes.length === 0 && !isOwner) notFound();

  const firstEpisode = episodes[0];
  const followers = series._count.followers;
  const initialFollowing = viewer
    ? Boolean(
        await prisma.seriesFollow.findUnique({
          where: { userId_seriesId: { userId: viewer.id, seriesId: id } },
        })
      )
    : false;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader title={series.title} backHref="/series" />

      <div className="flex flex-col gap-4 px-4">
        <h2 className="display text-2xl font-bold">{series.title}</h2>

        <Link
          href={`/creator/${series.creator.username}`}
          className="flex items-center gap-3"
        >
          <Avatar
            emoji={series.creator.avatarEmoji}
            color={series.creator.avatarColor}
            size={40}
          />
          <span className="font-bold">{series.creator.displayName}</span>
        </Link>

        {series.description && (
          <p className="whitespace-pre-wrap text-ink-soft">{series.description}</p>
        )}

        <p className="text-[14px] text-ink-soft">
          {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
          {" · "}
          {followers} {followers === 1 ? "follower" : "followers"}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {firstEpisode && (
            <Link
              href={`/watch/${firstEpisode.id}?series=${id}`}
              className="flex min-h-12 items-center rounded-full bg-accent px-6 font-bold text-white"
            >
              ▶ Watch this series
            </Link>
          )}
          <FollowButton
            endpoint={`/api/series/${id}/follow`}
            initialFollowing={initialFollowing}
            signedIn={Boolean(viewer)}
          />
        </div>
      </div>

      <section className="flex flex-col gap-3 px-4">
        <h3 className="text-lg font-bold">Episodes</h3>
        {episodes.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-ink-soft">
            No episodes yet — check back soon.
          </p>
        ) : (
          episodes.map((ep) => (
            <div key={ep.id} className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-ink-soft">
                Ep {ep.episodeNumber ?? "?"}
              </span>
              <VideoCard
                id={ep.id}
                title={ep.title}
                thumb={ep.thumb}
                durationSec={ep.durationSec}
                score={ep.score}
                creatorName={ep.creator.displayName}
                href={`/watch/${ep.id}?series=${id}`}
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
