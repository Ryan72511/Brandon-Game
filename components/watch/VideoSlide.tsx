"use client";

import { useEffect, useRef, useState } from "react";
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
  onProgress,
}: {
  video: FeedVideo;
  index: number;
  isActive: boolean;
  registerSlide: (index: number, el: HTMLDivElement | null) => void;
  registerVideo: (index: number, el: HTMLVideoElement | null) => void;
  onOpenSheet: (kind: "rate" | "save" | "comments" | "detail") => void;
  onEnded: () => void;
  onNextEpisode: (id: string) => void;
  onProgress?: (videoId: string, progressSec: number, completed: boolean) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [shareDone, setShareDone] = useState(false);
  const [ccOn, setCcOn] = useState(false);
  const [captionsUrl, setCaptionsUrl] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const resumedRef = useRef(false);
  const quartilesSent = useRef(new Set<number>());

  // Captions travel as WebVTT text; the player needs a same-origin URL.
  useEffect(() => {
    if (!video.captionsVtt) return;
    const url = URL.createObjectURL(new Blob([video.captionsVtt], { type: "text/vtt" }));
    setCaptionsUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video.captionsVtt]);

  useEffect(() => {
    if (!videoEl) return;
    const track = videoEl.textTracks[0];
    if (track) track.mode = ccOn ? "showing" : "hidden";
  }, [ccOn, videoEl, captionsUrl]);

  function maybeReportProgress(t: number, duration: number, ended: boolean) {
    if (!onProgress) return;
    if (ended) {
      onProgress(video.id, Math.floor(duration), true);
      return;
    }
    const quartile = Math.floor((t / Math.max(duration, 1)) * 4);
    if (quartile >= 1 && quartile <= 3 && !quartilesSent.current.has(quartile)) {
      quartilesSent.current.add(quartile);
      onProgress(video.id, Math.floor(t), false);
    }
  }

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
        return;
      }
    } catch {
      return; // user cancelled the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 1600);
    } catch {
      // No clipboard (e.g. non-HTTPS): show the link for manual copying.
      window.prompt("Copy this link:", url);
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
        <span className="ml-auto flex items-center gap-1.5">
          {video.mature && (
            <span className="rounded-full bg-gold px-2 py-1 text-[12px] font-bold text-[#1c1917]">
              Mature
            </span>
          )}
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
            {CATEGORY_LABELS[video.category as Category] ?? video.category}
          </span>
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
          crossOrigin="anonymous"
          preload={isActive ? "auto" : "metadata"}
          onClick={togglePlay}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onLoadedMetadata={(e) => {
            // Continue watching: resume where they left off, once.
            const el = e.currentTarget;
            if (!resumedRef.current && video.resumeAtSec && video.resumeAtSec > 2) {
              resumedRef.current = true;
              el.currentTime = Math.min(video.resumeAtSec, Math.max(el.duration - 1, 0));
            }
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setCurrentTime(el.currentTime);
            maybeReportProgress(el.currentTime, el.duration || duration, false);
          }}
          onEnded={(e) => {
            maybeReportProgress(0, e.currentTarget.duration || duration, true);
            onEnded();
          }}
          onError={() => setLoadFailed(true)}
        >
          {/* WebM first for browsers without H.264; sources fall through on
              load failure, so uploads (mp4-only) still resolve. */}
          {video.src.endsWith(".mp4") && (
            <source src={video.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
          )}
          <source src={video.src} type={video.src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
          {captionsUrl && <track kind="captions" src={captionsUrl} label="Captions" default />}
        </video>
        {loadFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
            <p className="font-bold">This video couldn&apos;t load</p>
            <p className="text-[14px] text-white/70">Check your connection and try again.</p>
            <button
              onClick={() => {
                setLoadFailed(false);
                videoEl?.load();
                videoEl?.play().catch(() => {});
              }}
              className="mt-1 min-h-12 rounded-full bg-white px-6 font-bold text-black"
            >
              Try again
            </button>
          </div>
        )}
        {paused && !loadFailed && (
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
        {video.captionsVtt && (
          <button
            onClick={() => setCcOn((c) => !c)}
            aria-pressed={ccOn}
            aria-label={ccOn ? "Turn captions off" : "Turn captions on"}
            className={`absolute right-3 top-[68px] flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-bold ${
              ccOn ? "bg-white text-black" : "bg-black/55 text-white"
            }`}
          >
            CC
          </button>
        )}
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
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            {video.myRating ? RATING_META[video.myRating as keyof typeof RATING_META].emoji : "🍿"}
          </span>
          {video.myRating ? "Rated" : "Pop it"}
        </button>
        <button
          onClick={() => onOpenSheet("save")}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            {saved ? "✅" : "➕"}
          </span>
          {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => onOpenSheet("comments")}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            💬
          </span>
          {video.commentCount > 0 ? `${video.commentCount} comments` : "Comment"}
        </button>
        <button
          onClick={share}
          className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-[13px] font-semibold hover:bg-white/10"
        >
          <span className="text-2xl leading-tight" aria-hidden>
            ↗️
          </span>
          {shareDone ? "Link copied!" : "Share"}
        </button>
      </div>

      {/* Why this video is here */}
      {(video.resumeAtSec || video.reason) && (
        <p className="px-4 pt-2 text-[13px] font-semibold text-white/60">
          {video.resumeAtSec ? "▸ Continue watching" : video.reason}
        </p>
      )}

      {/* Title + score + teaser -> detail sheet */}
      <button
        onClick={() => onOpenSheet("detail")}
        className="mx-4 mt-2 rounded-xl bg-white/5 p-3 text-left hover:bg-white/10"
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
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-white"
          >
            Next episode ▸
          </button>
        </div>
      )}
    </div>
  );
}
