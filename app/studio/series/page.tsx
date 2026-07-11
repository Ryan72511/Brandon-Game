import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

// All of a creator's mini-series. New series aren't made here — they happen
// naturally when you name one on the upload form.
export default async function StudioSeriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio/series");

  const seriesList = await prisma.series.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Your mini-series" backHref="/studio" />

      {seriesList.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-bold">No series yet</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Series start on the upload form — type a series name when you add a video and
            episodes number themselves. Once you have one, you can rename it and reorder
            episodes here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {seriesList.map((s) => (
            <li key={s.id}>
              <Link
                href={`/studio/series/${s.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 block font-bold">{s.title}</span>
                  <span className="block text-[14px] text-ink-soft">
                    {s._count.videos} {s._count.videos === 1 ? "episode" : "episodes"}
                  </span>
                </span>
                <span className="text-xl text-ink-soft" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
