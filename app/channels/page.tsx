import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import ChannelTile from "@/components/ChannelTile";
import ChannelLogo, { categoryLabel } from "@/components/ChannelLogo";
import GenreIcon from "@/components/GenreIcon";
import NewChannelButton from "@/components/NewChannelButton";

export const dynamic = "force-dynamic";

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 mt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-meta">
        {eyebrow}
      </p>
      <h2 className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-night-ink">
        {title}
      </h2>
    </div>
  );
}

// The storefront: a dark, Roku-style wall of channel brands. Every channel
// renders as its own "streamer" logo tile.
export default async function ChannelsPage() {
  const user = await getCurrentUser();

  const [mine, followedRaw, prebuilt] = await Promise.all([
    user
      ? prisma.channel.findMany({
          where: { ownerId: user.id },
          orderBy: { createdAt: "asc" },
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    user
      ? prisma.channel.findMany({
          where: { followers: { some: { userId: user.id } } },
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    prisma.channel.findMany({
      where: { isPrebuilt: true },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { videos: true } } },
    }),
  ]);
  // Plain JS, not a Prisma `not` filter: that would drop ownerId=null rows.
  const followed = followedRaw.filter((c) => c.ownerId !== user?.id);

  const surprise = prebuilt.find((c) => c.kind === "surprise");
  const weekly = prebuilt.find((c) => c.kind === "weekly");
  const lineup = prebuilt.filter((c) => c.kind === "normal");

  const count = (n: number) => `${n} ${n === 1 ? "video" : "videos"}`;
  // Tile caption: "Comedy · 5 videos" (or the maker's own category name).
  const captionFor = (c: { category: string; customCategory: string }, n: number) => {
    const label = categoryLabel(c.category, c.customCategory);
    return label ? `${label} · ${count(n)}` : count(n);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-night-raised/85 px-4 py-3 backdrop-blur-md">
        <h1 className="text-xl font-semibold text-night-ink">Channels</h1>
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-night-ink ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.14]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
        </Link>
      </header>

      <div className="px-4 pb-6">
        {/* Surprise Me billboard */}
        {surprise && (
          <Link
            href="/surprise"
            className="hero-iridescent relative mt-4 flex aspect-[2/1] w-full items-center gap-4 overflow-hidden rounded-2xl px-5 ring-1 ring-inset ring-white/15 transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15"
            >
              <GenreIcon genre="surprise" size={38} className="text-white/95" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[26px] font-extrabold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
                {surprise.name}
              </span>
              <span className="block text-[15px] text-white/80">Play something great</span>
            </span>
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-lg text-night-raised shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
            >
              ▶
            </span>
          </Link>
        )}

        {/* Discover: series + creators live alongside channels */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/series"
            className="flex min-h-16 items-center gap-3 rounded-2xl bg-white/[0.06] px-4 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.1]"
          >
            <span aria-hidden className="text-2xl">📺</span>
            <span className="min-w-0">
              <span className="block font-bold text-night-ink">Series</span>
              <span className="block text-[13px] text-night-meta">Binge start to finish</span>
            </span>
          </Link>
          <Link
            href="/creators"
            className="flex min-h-16 items-center gap-3 rounded-2xl bg-white/[0.06] px-4 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.1]"
          >
            <span aria-hidden className="text-2xl">✨</span>
            <span className="min-w-0">
              <span className="block font-bold text-night-ink">Creators</span>
              <span className="block text-[13px] text-night-meta">Meet the makers</span>
            </span>
          </Link>
        </div>

        {/* Your channels */}
        <SectionHeader eyebrow="Your lineup" title="Your channels" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {user ? (
            <NewChannelButton variant="tile" displayName={user.displayName} />
          ) : (
            <Link
              href="/login?next=/channels"
              className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/25 bg-white/[0.04] p-3 text-center transition hover:bg-white/[0.08]"
            >
              <span aria-hidden className="text-[28px] leading-none text-white/90">
                ＋
              </span>
              <span className="text-[15px] font-semibold leading-tight text-white/90">
                Sign in to build your own channel
              </span>
            </Link>
          )}
          {mine.map((c) => (
            <ChannelTile
              key={c.id}
              slug={c.slug}
              name={c.name}
              emoji={c.emoji}
              category={c.category}
              customCategory={c.customCategory}
              coverUrl={c.coverUrl}
              caption={captionFor(c, c._count.videos)}
            />
          ))}
        </div>

        {/* Following */}
        {followed.length > 0 && (
          <>
            <SectionHeader eyebrow="Following" title="Channels you follow" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              {followed.map((c) => (
                <ChannelTile
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  emoji={c.emoji}
                  category={c.category}
                  customCategory={c.customCategory}
                  coverUrl={c.coverUrl}
                  caption={captionFor(c, c._count.videos)}
                />
              ))}
            </div>
          </>
        )}

        {/* The full lineup */}
        <SectionHeader eyebrow="Always on" title="Every channel, always free" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {weekly && (
            <Link
              href={`/channel/${weekly.slug}`}
              className="group relative col-span-2 block transition duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <ChannelLogo
                slug={weekly.slug}
                category={weekly.category}
                name={weekly.name}
                emoji={weekly.emoji}
                variant="wide"
              />
              <span className="absolute right-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1c1917]">
                Auto
              </span>
              <span className="mt-1.5 block text-center text-[13px] font-medium text-night-meta">
                The week&apos;s top-rated videos, refreshed automatically
              </span>
            </Link>
          )}
          {lineup.map((c) => (
            <ChannelTile
              key={c.id}
              slug={c.slug}
              name={c.name}
              emoji={c.emoji}
              category={c.category}
              customCategory={c.customCategory}
              coverUrl={c.coverUrl}
              caption={captionFor(c, c._count.videos)}
            />
          ))}
        </div>

        {user && mine.length === 0 && (
          <p className="mt-8 rounded-xl bg-white/[0.06] p-4 text-[15px] text-night-ink-soft ring-1 ring-white/10">
            Tip: while watching, tap <span className="font-bold text-night-ink">Save</span> on any
            video to start filling your own channel.
          </p>
        )}
      </div>
    </div>
  );
}
