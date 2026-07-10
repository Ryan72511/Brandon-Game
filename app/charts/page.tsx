import Link from "next/link";
import { getChart } from "@/lib/charts";
import { getFeedVideos } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

// The Popcorn charts: Top This Week and All-Time Greats.
export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const period = t === "alltime" ? "alltime" : "weekly";
  const user = await getCurrentUser();

  const rows = await getChart(period, 20);
  const videos = await getFeedVideos(
    rows.map((r) => r.videoId),
    user?.id ?? null
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="🏆 Charts" />

      <div className="flex gap-2" role="tablist" aria-label="Chart period">
        <Link
          href="/charts"
          role="tab"
          aria-selected={period === "weekly"}
          className={`min-h-12 flex-1 rounded-full py-3 text-center font-bold ${
            period === "weekly" ? "bg-accent text-white" : "border-2 border-line bg-surface"
          }`}
        >
          Top this week
        </Link>
        <Link
          href="/charts?t=alltime"
          role="tab"
          aria-selected={period === "alltime"}
          className={`min-h-12 flex-1 rounded-full py-3 text-center font-bold ${
            period === "alltime" ? "bg-accent text-white" : "border-2 border-line bg-surface"
          }`}
        >
          All-time greats
        </Link>
      </div>

      {videos.length === 0 ? (
        <p className="rounded-2xl bg-surface p-4 text-ink-soft">
          Not enough ratings yet this {period === "weekly" ? "week" : "…ever"}. Go pop some
          popcorn on videos you like!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {videos.map((v, i) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              thumb={v.thumb}
              durationSec={v.durationSec}
              score={v.score}
              creatorName={v.creator.displayName}
              rank={i + 1}
            />
          ))}
        </div>
      )}

      <p className="text-center text-[14px] text-ink-soft">
        Ranked by Popcorn Score — the share of viewers who popped for it, smoothed so a
        couple of votes can’t top the chart.
      </p>
    </div>
  );
}
