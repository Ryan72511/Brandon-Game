import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { publicVideoWhere } from "@/lib/visibility";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

// The Creators browse page — a searchable space to discover and follow the
// makers behind the shows. Signed-out visitors can browse; Follow routes them
// to login via FollowButton itself.
export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawParam } = await searchParams;
  const raw = (rawParam ?? "").trim();
  // Searchable only at >= 2 chars; below that we fall back to the default list.
  const q = raw.length >= 2 ? raw : "";
  const viewer = await getCurrentUser();

  const select = {
    id: true,
    username: true,
    displayName: true,
    avatarEmoji: true,
    avatarColor: true,
    bio: true,
    _count: { select: { videos: { where: publicVideoWhere() } } },
  } as const;

  // Fetch the creators to show — either a search or the popular default.
  let creators;
  if (q) {
    // SQLite's LIKE is ASCII-case-insensitive but Prisma doesn't guarantee it
    // across providers, so query both the raw text and its lowercase form.
    const variants = [...new Set([q, q.toLowerCase()])];
    const or = variants.flatMap((v) => [
      { username: { contains: v } },
      { displayName: { contains: v } },
    ]);
    creators = await prisma.user.findMany({
      where: { suspended: false, OR: or },
      orderBy: { createdAt: "asc" },
      take: 30,
      select,
    });
  } else {
    // Popular default: real creators only (a published video or a follower),
    // ranked by followers then video count. Two-stage so empty accounts don't
    // dominate: first the id ranking, then hydrate the rows we're keeping.
    const followerRanked = await prisma.creatorFollow.groupBy({
      by: ["creatorId"],
      _count: true,
      orderBy: { _count: { creatorId: "desc" } },
      take: 30,
    });
    const followerRankIds = followerRanked.map((r) => r.creatorId);

    const rows = await prisma.user.findMany({
      where: {
        suspended: false,
        OR: [
          { videos: { some: publicVideoWhere() } },
          { id: { in: followerRankIds } },
        ],
      },
      take: 30,
      select,
    });

    // Order client-side by followers desc, then video count desc — the follower
    // counts get computed once below, shared with rendering.
    const rank = new Map(followerRankIds.map((id, i) => [id, i]));
    creators = rows.sort((a, b) => {
      const fa = rank.has(a.id) ? followerRanked[rank.get(a.id)!]._count : 0;
      const fb = rank.has(b.id) ? followerRanked[rank.get(b.id)!]._count : 0;
      if (fb !== fa) return fb - fa;
      return b._count.videos - a._count.videos;
    });
  }

  const ids = creators.map((c) => c.id);

  // Batch the two follow-graph reads — no per-row queries.
  const [followerGroups, viewerFollowing] = await Promise.all([
    ids.length
      ? prisma.creatorFollow.groupBy({
          by: ["creatorId"],
          where: { creatorId: { in: ids } },
          _count: true,
        })
      : Promise.resolve([]),
    viewer && ids.length
      ? prisma.creatorFollow.findMany({
          where: { followerId: viewer.id, creatorId: { in: ids } },
          select: { creatorId: true },
        })
      : Promise.resolve([]),
  ]);

  const followerCount = new Map(followerGroups.map((g) => [g.creatorId, g._count]));
  const followingSet = new Set(viewerFollowing.map((f) => f.creatorId));

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="Creators" />

      <p className="text-ink-soft">Find the makers behind the shows.</p>

      <form action="/creators" method="get" className="flex gap-2">
        <label htmlFor="creator-q" className="sr-only">
          Search creators
        </label>
        <input
          id="creator-q"
          name="q"
          type="search"
          defaultValue={raw}
          placeholder="Search creators"
          autoComplete="off"
          className="min-h-12 flex-1 rounded-full border-2 border-line bg-surface px-4 text-ink placeholder:text-ink-soft"
        />
        <button
          type="submit"
          className="min-h-12 rounded-full bg-accent px-6 font-bold text-white"
        >
          Search
        </button>
      </form>

      {creators.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-ink-soft">
          {q ? "No creators match that yet." : "No creators to show yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {creators.map((c) => {
            const followers = followerCount.get(c.id) ?? 0;
            const videos = c._count.videos;
            const isSelf = viewer?.id === c.id;
            return (
              <li key={c.id} className="relative">
                <Link
                  href={`/creator/${c.username}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-card"
                >
                  <Avatar emoji={c.avatarEmoji} color={c.avatarColor} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{c.displayName}</span>
                    <span className="block truncate text-[13px] text-ink-soft">@{c.username}</span>
                    {c.bio && (
                      <span className="mt-1 line-clamp-2 block text-[14px] text-ink-soft">
                        {c.bio}
                      </span>
                    )}
                    <span className="mt-1 block text-[13px] text-ink-soft">
                      {followers} {followers === 1 ? "follower" : "followers"} · {videos}{" "}
                      {videos === 1 ? "video" : "videos"}
                    </span>
                  </span>
                </Link>
                {/* Sits above the card Link so the button click doesn't navigate.
                    Hidden on the viewer's own card. */}
                {!isSelf && (
                  <span className="absolute right-3 top-3">
                    <FollowButton
                      endpoint={`/api/creators/${c.username}/follow`}
                      initialFollowing={followingSet.has(c.id)}
                      signedIn={Boolean(viewer)}
                      size="sm"
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
