import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import ChannelCard from "@/components/ChannelCard";
import NewChannelButton from "@/components/NewChannelButton";

export const dynamic = "force-dynamic";

// The channel guide: Surprise Me pinned first, then your channels, channels
// you follow, and the prebuilt lineup.
export default async function ChannelsPage() {
  const user = await getCurrentUser();

  const [mine, followed, prebuilt] = await Promise.all([
    user
      ? prisma.channel.findMany({
          where: { ownerId: user.id },
          orderBy: { createdAt: "asc" },
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    user
      ? prisma.channel
          .findMany({
            where: { followers: { some: { userId: user.id } } },
            include: { _count: { select: { videos: true } } },
          })
          // Not a Prisma `not` filter: that would also drop ownerId=null
          // (prebuilt) channels, since SQL NULL != x is never true.
          .then((rows) => rows.filter((c) => c.ownerId !== user.id))
      : Promise.resolve([]),
    prisma.channel.findMany({
      where: { isPrebuilt: true },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { videos: true } } },
    }),
  ]);

  const surprise = prebuilt.find((c) => c.kind === "surprise");
  const regularPrebuilt = prebuilt.filter((c) => c.kind !== "surprise");

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader title="Channels" />

      {surprise && (
        <Link
          href="/surprise"
          className="flex min-h-24 items-center gap-4 rounded-3xl bg-accent p-5 text-white shadow-card"
        >
          <span className="text-4xl" aria-hidden>
            {surprise.emoji}
          </span>
          <span className="flex-1">
            <span className="block text-xl font-bold">{surprise.name}</span>
            <span className="block text-white/85">{surprise.description}</span>
          </span>
          <span aria-hidden className="text-2xl">
            ›
          </span>
        </Link>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your channels</h2>
          {user && <NewChannelButton />}
        </div>
        {!user ? (
          <p className="rounded-2xl bg-surface p-4 text-ink-soft">
            <Link href="/login" className="font-bold text-accent underline">
              Sign in
            </Link>{" "}
            to make channels of your own — like a TV channel for anything you love.
          </p>
        ) : mine.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-ink-soft">
            No channels yet. Tap “New channel”, or save any video while watching.
          </p>
        ) : (
          mine.map((c) => (
            <ChannelCard
              key={c.id}
              slug={c.slug}
              name={c.name}
              emoji={c.emoji}
              description={c.description}
              videoCount={c._count.videos}
            />
          ))
        )}
      </section>

      {followed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Channels you follow</h2>
          {followed.map((c) => (
            <ChannelCard
              key={c.id}
              slug={c.slug}
              name={c.name}
              emoji={c.emoji}
              description={c.description}
              videoCount={c._count.videos}
            />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Always on</h2>
        {regularPrebuilt.map((c) => (
          <ChannelCard
            key={c.id}
            slug={c.slug}
            name={c.name}
            emoji={c.emoji}
            description={c.description}
            videoCount={c.kind === "weekly" ? undefined : c._count.videos}
            badge={c.kind === "weekly" ? "Auto" : undefined}
          />
        ))}
      </section>
    </div>
  );
}
