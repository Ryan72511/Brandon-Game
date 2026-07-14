import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { publicVideoWhere } from "@/lib/visibility";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

// Browse every mini-series with something public to watch — so a story
// doesn't have to be dug out of a creator's page to be found.
export default async function SeriesBrowsePage() {
  // Pages work signed out; we only read the viewer to stay consistent with
  // the rest of the app (no viewer-specific filtering needed here).
  await getCurrentUser();

  const seriesList = await prisma.series.findMany({
    where: {
      creator: { suspended: false },
      videos: { some: publicVideoWhere() },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      creator: { select: { displayName: true } },
      _count: {
        select: {
          videos: { where: publicVideoWhere() },
          followers: true,
        },
      },
    },
  });

  // Posters (episode-1 thumbs) in one batched query, not one-per-series:
  // pull every public video for these series ordered by episode, then keep
  // the lowest-numbered thumb we see for each.
  const posterBySeries = new Map<string, string>();
  if (seriesList.length > 0) {
    const posterRows = await prisma.video.findMany({
      where: {
        seriesId: { in: seriesList.map((s) => s.id) },
        ...publicVideoWhere(),
      },
      orderBy: { episodeNumber: "asc" },
      select: { seriesId: true, thumb: true },
    });
    for (const row of posterRows) {
      if (row.seriesId && !posterBySeries.has(row.seriesId)) {
        posterBySeries.set(row.seriesId, row.thumb);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Series" />
      <p className="text-ink-soft">Binge a story from start to finish.</p>

      {seriesList.length === 0 ? (
        <p className="rounded-xl bg-surface p-4 text-ink-soft">
          No series yet — creators are just getting started.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {seriesList.map((s) => {
            const poster = posterBySeries.get(s.id);
            const episodes = s._count.videos;
            const followers = s._count.followers;
            return (
              <Link
                key={s.id}
                href={`/series/${s.id}`}
                className="flex gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-card"
              >
                <span className="relative block aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-line">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">
                      🎬
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="line-clamp-1 font-bold">{s.title}</span>
                  <span className="mt-0.5 truncate text-[14px] text-ink-soft">
                    {s.creator.displayName}
                  </span>
                  <span className="mt-1 text-[13px] text-ink-soft">
                    {episodes} {episodes === 1 ? "episode" : "episodes"}
                    {followers > 0 && (
                      <>
                        {" · "}
                        {followers} {followers === 1 ? "follower" : "followers"}
                      </>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
