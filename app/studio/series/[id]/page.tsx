import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import SeriesEditor from "@/components/SeriesEditor";

export const dynamic = "force-dynamic";

// Edit one mini-series: rename it and reorder episodes. Owner-only.
export default async function StudioSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio/series");

  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: { episodeNumber: "asc" },
        select: { id: true, episodeNumber: true, title: true, thumb: true },
      },
    },
  });
  if (!series || series.creatorId !== user.id) redirect("/studio/series");

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title={series.title} backHref="/studio/series" />
      <SeriesEditor
        series={{ id: series.id, title: series.title, description: series.description }}
        episodes={series.videos}
      />
    </div>
  );
}
