import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/data";
import { recommendForChannel } from "@/lib/recs";
import { getChart } from "@/lib/charts";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";
import ChannelActions from "@/components/ChannelActions";
import ChannelLogo from "@/components/ChannelLogo";
import AddToChannelButton from "@/components/AddToChannelButton";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const channel = await prisma.channel.findUnique({
    where: { slug },
    include: {
      owner: { select: { username: true, displayName: true } },
      _count: { select: { followers: true } },
    },
  });
  if (!channel) notFound();
  if (channel.kind === "surprise") redirect("/surprise");

  // The weekly channel mirrors the Top This Week chart automatically.
  let videoIds: string[];
  if (channel.kind === "weekly") {
    videoIds = (await getChart("weekly", 20)).map((r) => r.videoId);
  } else {
    const rows = await prisma.channelVideo.findMany({
      where: { channelId: channel.id },
      orderBy: { addedAt: "desc" },
      select: { videoId: true },
    });
    videoIds = rows.map((r) => r.videoId);
  }

  const isOwner = Boolean(user && channel.ownerId === user.id);
  const [videos, following, recIds] = await Promise.all([
    getFeedVideos(videoIds, user?.id ?? null),
    user
      ? prisma.follow
          .findUnique({
            where: { userId_channelId: { userId: user.id, channelId: channel.id } },
          })
          .then(Boolean)
      : Promise.resolve(false),
    channel.kind === "normal" ? recommendForChannel(channel.id, 6) : Promise.resolve([]),
  ]);
  const recs = await getFeedVideos(recIds, user?.id ?? null);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHeader title={channel.name} backHref="/channels" dark />

      <div className="flex flex-col gap-3 px-4">
        <ChannelLogo
          slug={channel.slug}
          category={channel.category}
          name={channel.name}
          emoji={channel.emoji}
          variant="wide"
        />
        {channel.description && <p className="text-night-ink-soft">{channel.description}</p>}
        <p className="text-[14px] text-night-meta">
          {channel.isPrebuilt ? (
            "A Reely original channel"
          ) : channel.owner ? (
            <>
              Made by{" "}
              <Link href={`/creator/${channel.owner.username}`} className="font-bold text-white">
                {channel.owner.displayName}
              </Link>
            </>
          ) : null}
          {" · "}
          {channel._count.followers} {channel._count.followers === 1 ? "follower" : "followers"}
        </p>
        <ChannelActions
          channelId={channel.id}
          slug={channel.slug}
          name={channel.name}
          firstVideoId={videos[0]?.id ?? null}
          following={following}
          signedIn={Boolean(user)}
          isOwner={isOwner}
        />
      </div>

      <section className="flex flex-col gap-3 px-4">
        {videos.length === 0 ? (
          <p className="rounded-xl bg-white/[0.06] p-4 text-night-ink-soft ring-1 ring-white/10">
            {isOwner
              ? "Nothing saved here yet. While watching, tap Save on any video you like."
              : "Nothing in this channel yet — check back soon!"}
          </p>
        ) : (
          videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumb={v.thumb}
              durationSec={v.durationSec}
              score={v.score}
              creatorName={v.creator.displayName}
              href={`/watch/${v.id}?ch=${channel.slug}`}
              dark
            />
          ))
        )}
      </section>

      {recs.length > 0 && (
        <section className="flex flex-col gap-3 px-4">
          <h2 className="text-lg font-bold text-night-ink">
            {isOwner ? "You might want these in here" : "More like this channel"}
          </h2>
          {recs.map((v) => (
            <div key={v.id} className="relative">
              <VideoCard
                id={v.id}
                title={v.title}
                thumb={v.thumb}
                durationSec={v.durationSec}
                score={v.score}
                creatorName={v.creator.displayName}
                dark
              />
              {isOwner && <AddToChannelButton channelId={channel.id} videoId={v.id} />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
