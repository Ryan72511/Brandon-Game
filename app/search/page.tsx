import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import VideoCard from "@/components/VideoCard";
import ChannelTile from "@/components/ChannelTile";
import Avatar from "@/components/Avatar";
import { EMPTY_RESULTS, normalizeQuery, searchAll } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-[20px] font-bold text-night-ink">{children}</h2>;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawParam } = await searchParams;
  const raw = (rawParam ?? "").trim();
  const q = normalizeQuery(raw);
  const viewer = await getCurrentUser();
  const results = q ? await searchAll(q, viewer?.id) : EMPTY_RESULTS;
  const hasResults =
    results.videos.length > 0 || results.creators.length > 0 || results.channels.length > 0;

  return (
    <div className="min-h-dvh">
      <PageHeader title="Search" backHref="/channels" dark />

      <div className="px-4 pb-8">
        <div className="mt-4">
          {/* Keyed on q so a new search from the URL resets the field. */}
          <SearchBar key={q || raw} defaultValue={q || raw} />
        </div>

        {/* Start state */}
        {!raw && (
          <p className="mt-8 rounded-xl bg-white/[0.06] p-4 text-center text-[15px] text-night-ink-soft ring-1 ring-white/10">
            Search shows, creators, and channels
          </p>
        )}

        {/* Too short / too long to search */}
        {raw && !q && (
          <p className="mt-8 rounded-xl bg-white/[0.06] p-4 text-center text-[15px] text-night-ink-soft ring-1 ring-white/10">
            Type at least 2 letters to search
          </p>
        )}

        {/* No matches */}
        {q && !hasResults && (
          <p className="mt-8 rounded-xl bg-white/[0.06] p-4 text-center text-[15px] text-night-ink-soft ring-1 ring-white/10">
            No matches for &ldquo;{q}&rdquo; &mdash; try another word
          </p>
        )}

        {results.videos.length > 0 && (
          <section>
            <SectionTitle>Videos</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {results.videos.map((v) => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumb={v.thumb}
                  durationSec={v.durationSec}
                  score={v.score}
                  creatorName={v.creatorName}
                  dark
                />
              ))}
            </div>
          </section>
        )}

        {results.creators.length > 0 && (
          <section>
            <SectionTitle>Creators</SectionTitle>
            <div className="flex flex-col gap-2">
              {results.creators.map((c) => (
                <Link
                  key={c.username}
                  href={`/creator/${c.username}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10 transition hover:bg-white/[0.1]"
                >
                  <Avatar emoji={c.avatarEmoji} color={c.avatarColor} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-night-ink">
                      {c.displayName}
                    </span>
                    <span className="block truncate text-[13px] text-night-ink-soft">
                      @{c.username}
                      {c.bio ? ` · ${c.bio}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results.channels.length > 0 && (
          <section>
            <SectionTitle>Channels</SectionTitle>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              {results.channels.map((c) => (
                <ChannelTile
                  key={c.slug}
                  slug={c.slug}
                  name={c.name}
                  emoji={c.emoji}
                  category={c.category}
                  customCategory={c.customCategory}
                  coverUrl={c.coverUrl}
                  caption={`${c.videoCount} ${c.videoCount === 1 ? "video" : "videos"}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
