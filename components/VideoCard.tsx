import Link from "next/link";
import ScoreBadge from "@/components/ScoreBadge";
import { formatDuration } from "@/lib/format";
import type { ScoreDisplay } from "@/lib/score";

// A 16x9 thumbnail card used in channel pages, charts, and profiles.
export default function VideoCard({
  id,
  title,
  thumb,
  durationSec,
  score,
  creatorName,
  href,
  rank,
}: {
  id: string;
  title: string;
  thumb: string;
  durationSec: number;
  score: ScoreDisplay;
  creatorName?: string;
  href?: string;
  rank?: number;
}) {
  return (
    <Link
      href={href ?? `/watch/${id}`}
      className="block overflow-hidden rounded-xl border border-line bg-surface shadow-card"
    >
      <span className="relative block aspect-video w-full bg-line">
        {/* Plain img: thumbs are tiny and come from our own /media route. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {rank !== undefined && (
          <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 font-bold text-white">
            {rank}
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[12px] font-bold text-white">
          {formatDuration(durationSec)}
        </span>
      </span>
      <span className="block p-3">
        <span className="line-clamp-1 block font-bold">{title}</span>
        <span className="mt-1 flex items-center gap-2">
          <ScoreBadge score={score} size="sm" />
          {creatorName && (
            <span className="truncate text-[14px] text-ink-soft">{creatorName}</span>
          )}
        </span>
      </span>
    </Link>
  );
}
