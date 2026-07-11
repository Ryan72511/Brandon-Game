import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { notifyMany } from "@/lib/notify";

type Params = [{ params: Promise<{ id: string }> }];

async function ownedChannel(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, ownerId: true, name: true, slug: true },
  });
  if (!channel || channel.ownerId !== userId) return null;
  return channel;
}

export const POST = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === "string" ? body.videoId : "";

  const channel = await ownedChannel(id, user.id);
  if (!channel) return jsonError("That's not one of your channels.", 403);
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, title: true },
  });
  if (!video) return jsonError("Video not found.", 404);

  await prisma.channelVideo.upsert({
    where: { channelId_videoId: { channelId: id, videoId } },
    create: { channelId: id, videoId },
    update: {},
  });

  // Let followers know — never blocks or breaks the add itself.
  const followers = await prisma.follow.findMany({
    where: { channelId: id },
    select: { userId: true },
    take: 500,
  });
  await notifyMany(
    followers.map((f) => f.userId).filter((uid) => uid !== user.id),
    "channel_video",
    `New in ${channel.name}: “${video.title}”`,
    `/watch/${videoId}?ch=${channel.slug}`
  );

  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === "string" ? body.videoId : "";

  const channel = await ownedChannel(id, user.id);
  if (!channel) return jsonError("That's not one of your channels.", 403);

  await prisma.channelVideo.deleteMany({ where: { channelId: id, videoId } });
  return NextResponse.json({ ok: true });
});
