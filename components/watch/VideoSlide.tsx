"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ScoreBadge from "@/components/ScoreBadge";
import { formatTimecode } from "@/lib/format";
import { CATEGORY_LABELS, RATING_META, type Category } from "@/lib/constants";
import type { FeedVideo } from "@/lib/data";

// One feed slide: 16x9 letterboxed player + always-visible action bar below
// (no floating overlays — they fail older users and cover the picture).
export default function VideoSlide({
  video,
  index,
  isActive,
  registerSlide,
  registerVideo,
  onOpenSheet,
  onEnded,
  onNextEpisode,
}: {
  video: FeedVideo;
  index: number;
  isActive: boolean;
  registerSlide: (index: number, el: HTMLDivElement | null) => void;
  registerVideo: (index: number, el: HTMLVideoElement | null) => void;
  onOpenSheet: (kind: "rate" | "save" | "comments" | "detail") => void;
  onEnded: () => void;
  onNextEpisode: (id: string) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [shareDone, setShareDone] = useState(false);

  function togglePlay() {
    if (!videoEl) return;
    if (videoEl.paused) videoEl.play().catch(() => {});
    else videoEl.pause();
  }

  async function share() {
    const url = `${window.location.origin}/watch/${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 1600);
      }
    } catch {
      /* user cancelled */
    }
  }

  const saved = video.savedInChannelIds.length > 0;
  const duration = video.durationSec || 1;

  return (
    <div
      ref={(el) => registerSlide(index, el)}
      data-index={index}
      className="flex h-full snap-start flex-col justify-center px-0 py-2 text-white"
    >
      {/* Creator row */}
      <div className="flex items-center gap-2.5 px-4 pb-2">
        <Link
          href={`/creator/${video.creator.username}`}
          className="flex min-h-12 items-center gap-2.5"
        >
          <Avatar emoji={video.creator.avatarEmoji} color={video.creator.avatarColor} size={36} />
          <span className="font-bold">{video.creator.displayName}</span>
        </Link>
        <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
          {CATEGORY_LABELS[video.category as Category] ?? video.category}
        </span>
      </div>

      {/* Player */}
      <div className="relative w-full">
        <video
          ref={(el) => {
            registerVideo(index, el);
            setVideoEl(el);
          }}
          poster={video.thumb}
          className="aspect-video w-full bg-black"
          playsInline
          muted={muted}
          preload={isActive ? "auto" : "metadata"}
          onClick={togglePlay}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={onEnded}
        >
          {/* WebM first for browsers without H.264; sources fall through on
              load failure, so uploads (mp4-only) still resolve. */}
          {video.src.endsWith(".mp4") && (
            <source src={video.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
          )}
          <source src={video.src} type={video.src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
        </video>
        {paused && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/55 text-4xl"
          >
            ▶
          </button>
        )}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Scrubber with comment tick marks */}
      <div className="px-4 pt-1">
        <div className="relative">
          {video.commentTimecodes.map((t, i) => (
            <span
              key={i}
              aria-hidden
              title="Someone commented here"
              className="pointer-events-none absolute top-[9px] z-10 h-1.5 w-1 rounded bg-gold"
              style={{ left: `${Math.min(t / duration, 1) * 100}%` }}
            />
          ))}
          <input
            type="range"
            className="scrubber"
            min={0}
            max={duration}
            step={0.1}
            value={Math.min(currentTime, duration)}
            aria-label="Video progress"
            onChange={(e) => {
              if (videoEl) videoEl.currentTime = Number(e.target.value);
            }}
          />
        </div>
        <div className="flex justify-between text-[13px] text-white/70">
          <span>{formatTimecode(currentTime)}</span>
          <span>{formatTimecode(duration)}</span>
        </div>
      </div>

      {/* Action bar — icon + label, 56px targets, always visible */}
      <div className="flex items-stretch gap-1 px-3 pt-1">
        <button
          onClick={() => onOpenSheet("rate")}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            {video.myRating ? RATING_META[video.myRating as keyof typeof RATING_META].emoji : "🍿"}
          </span>
          {video.myRating ? "Rated" : "Pop it"}
        </button>
        <button
          onClick={() => onOpenSheet("save")}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            {saved ? "✅" : "➕"}
          </span>
          {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => onOpenSheet("comments")}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            💬
          </span>
          {video.commentCount > 0 ? `${video.commentCount} comments` : "Comment"}
        </button>
        <button
          onClick={share}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            ↗️
          </span>
          {shareDone ? "Link copied!" : "Share"}
        </button>
      </div>

      {/* Title + score + teaser -> detail sheet */}
      <button
        onClick={() => onOpenSheet("detail")}
        className="mx-4 mt-2 rounded-2xl bg-white/5 p-3 text-left hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 flex-1 text-lg font-bold">{video.title}</span>
          <ScoreBadge score={video.score} size="sm" />
        </span>
        {(video.backstory || video.description) && (
          <span className="mt-1 line-clamp-1 block text-[15px] text-white/70">
            {video.backstory ? `The story: ${video.backstory}` : video.description}
          </span>
        )}
        <span className="mt-0.5 block text-[13px] font-semibold text-white/50">
          Tap for the full story ↑
        </span>
      </button>

      {video.nextEpisodeId && (
        <div className="px-4 pt-2">
          <button
            onClick={() => onNextEpisode(video.nextEpisodeId!)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-white"
          >
            Next episode ▸
          </button>
        </div>
      )}
    </div>
  );
}
