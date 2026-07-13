import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { recommendForUser } from "@/lib/recs";
import { getChart } from "@/lib/charts";
import { isPublicVideo, publicVideoWhere } from "@/lib/visibility";
import { isAdult } from "@/lib/age";
import { getFeedVideos, getMyChannels } from "@/lib/data";
import WatchFeed from "@/components/watch/WatchFeed";

export const dynamic = "force-dynamic";

// Watch a specific video — the share-link landing. Context decides what
// comes next when you keep scrolling:
//   ?ch=<slug>    the rest of that channel
//   ?series=<id>  the episodes in order
//   (none)        recommendations seeded from this video
export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ch?: string; series?: string }>;
}) {
  const { id } = await params;
  const { ch, series } = await searchParams;
  const user = await getCurrentUser();

  // Direct links to drafts, pending, removed, or suspended-creator videos
  // 404 for everyone but the creator — no metadata leaks via deep links.
  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      publishAt: true,
      creatorId: true,
      mature: true,
      creator: { select: { suspended: true } },
    },
  });
  if (!video) notFound();
  const isOwnVideo = video.creatorId === user?.id;
  const visible = (isPublicVideo(video) && !video.creator.suspended) || isOwnVideo;
  if (!visible) notFound();
  // Mature video, non-adult viewer: 404 rather than reveal it exists.
  if (video.mature && !isOwnVideo) {
    const viewer = user
      ? await prisma.user.findUnique({ where: { id: user.id }, select: { birthYear: true } })
      : null;
    if (!isAdult(viewer?.birthYear)) notFound();
  }
  // A blocked creator's video 404s for the blocker too — otherwise the feed
  // filter would strip it and silently show a different video.
  if (user && video.creatorId !== user.id) {
    const blocked = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: video.creatorId } },
    });
    if (blocked) notFound();
  }

  let ids: string[] = [id];
  if (ch) {
    const channel = await prisma.channel.findUnique({
      where: { slug: ch },
      select: { id: true, kind: true },
    });
    if (channel) {
      // The weekly channel has no saved rows — its contents ARE the chart.
      // Filter the saved rows through public visibility so a removed or
      // suspended-creator video can't ride the channel swipe chain.
      const channelIds =
        channel.kind === "weekly"
          ? (await getChart("weekly", 20)).map((r) => r.videoId)
          : (
              await prisma.channelVideo.findMany({
                where: { channelId: channel.id, video: publicVideoWhere() },
                orderBy: { addedAt: "desc" },
                select: { videoId: true },
                // Cap the swipe chain — a huge channel must not mount hundreds
                // of <video> nodes or serialize hundreds of rows at once.
                take: 60,
              })
            ).map((v) => v.videoId);
      // Start at the shared video, keep the channel's order after it.
      ids = [id, ...channelIds.filter((v) => v !== id)];
    }
  } else if (series) {
    const episodes = await prisma.video.findMany({
      where: { seriesId: series },
      orderBy: { episodeNumber: "asc" },
      select: { id: true },
      take: 100,
    });
    if (episodes.length > 0) {
      const seriesIds = episodes.map((e) => e.id);
      const start = seriesIds.indexOf(id);
      ids = start >= 0 ? [...seriesIds.slice(start), ...seriesIds.slice(0, start)] : [id, ...seriesIds];
    }
  }

  let reasons = new Map<string, string>();
  if (!ch && !series) {
    const recs = await recommendForUser(user?.id ?? null, {
      excludeVideoIds: [id],
      limit: 19,
    });
    ids = [id, ...recs.map((r) => r.id)];
    reasons = new Map(recs.filter((r) => r.reason).map((r) => [r.id, r.reason]));
  }

  const [videos, channels] = await Promise.all([
    getFeedVideos(ids, user?.id ?? null, { reasons }),
    user ? getMyChannels(user.id) : Promise.resolve([]),
  ]);

  return (
    <WatchFeed
      videos={videos}
      startId={id}
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
    />
  );
}
