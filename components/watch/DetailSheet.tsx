"use client";

import Link from "next/link";
import Sheet from "./Sheet";
import Avatar from "@/components/Avatar";
import ScoreBadge from "@/components/ScoreBadge";
import { RATING_META } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { FeedVideo } from "@/lib/data";

// "About this video" — backstory, rating breakdown, tags, creator link.
// Celebrating the maker is the whole point of this sheet.
export default function DetailSheet({
  video,
  onClose,
}: {
  video: FeedVideo;
  onClose: () => void;
}) {
  return (
    <Sheet title={video.title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Link
          href={`/creator/${video.creator.username}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3"
        >
          <Avatar emoji={video.creator.avatarEmoji} color={video.creator.avatarColor} size={44} />
          <span className="flex-1">
            <span className="block font-bold">{video.creator.displayName}</span>
            <span className="block text-[15px] text-ink-soft">
              See their creator page →
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={video.score} />
          <span className="text-[15px] text-ink-soft">
            {video.viewCount} views · {timeAgo(video.createdAt)}
          </span>
        </div>

        {video.series && (
          <p className="rounded-xl bg-gold-soft px-4 py-2 text-[15px] font-semibold">
            🎬 {video.series.title}
            {video.episodeNumber ? ` — Episode ${video.episodeNumber}` : ""}
          </p>
        )}

        {video.description && <p>{video.description}</p>}

        {video.backstory && (
          <div>
            <h3 className="mb-1 font-bold">How this was made</h3>
            <p className="whitespace-pre-wrap text-ink-soft">{video.backstory}</p>
          </div>
        )}

        {video.score.kind === "scored" && (
          <div className="flex gap-3 text-[15px] text-ink-soft">
            {(["butter", "popped", "burnt"] as const).map((v) => (
              <span key={v}>
                {RATING_META[v].emoji} {RATING_META[v].label}
              </span>
            ))}
          </div>
        )}

        {video.tags.length > 0 && (
          <p className="flex flex-wrap gap-2">
            {video.tags.map((t) => (
              <span key={t} className="rounded-full bg-line/60 px-3 py-1 text-[14px] font-semibold">
                #{t}
              </span>
            ))}
          </p>
        )}
      </div>
    </Sheet>
  );
}
