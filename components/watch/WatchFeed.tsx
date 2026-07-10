"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VideoSlide from "./VideoSlide";
import RateSheet from "./RateSheet";
import SaveSheet from "./SaveSheet";
import CommentsSheet from "./CommentsSheet";
import DetailSheet from "./DetailSheet";
import type { FeedVideo } from "@/lib/data";
import type { MyChannel } from "./types";
import {
  MIN_RATINGS_FOR_SCORE,
  FRESH_POP_THRESHOLD,
  type RatingValue,
} from "@/lib/constants";

type SheetKind = null | "rate" | "save" | "comments" | "detail";

interface RateResponse {
  counts: { burnt: number; popped: number; butter: number };
  score: number;
}

// The vertical watch feed: scroll-snap slides, one video playing at a time,
// sheets act on whichever video is on screen.
export default function WatchFeed({
  videos,
  startId,
  signedIn,
  myChannels: initialChannels,
  emptyMessage = "Nothing to watch here yet.",
}: {
  videos: FeedVideo[];
  startId?: string;
  signedIn: boolean;
  myChannels: MyChannel[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(videos);
  const [myChannels, setMyChannels] = useState(initialChannels);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideEls = useRef(new Map<number, HTMLDivElement>());
  const videoEls = useRef(new Map<number, HTMLVideoElement>());
  const viewedIds = useRef(new Set<string>());

  const registerSlide = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) slideEls.current.set(index, el);
    else slideEls.current.delete(index);
  }, []);
  const registerVideo = useCallback((index: number, el: HTMLVideoElement | null) => {
    if (el) videoEls.current.set(index, el);
    else videoEls.current.delete(index);
  }, []);

  // Jump to the requested start video before paint.
  useEffect(() => {
    if (!startId) return;
    const index = items.findIndex((v) => v.id === startId);
    if (index > 0) {
      slideEls.current.get(index)?.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId]);

  // One video plays at a time: the slide that owns >=60% of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (entry.isIntersecting) setActiveIndex(index);
        }
      },
      { root: containerRef.current, threshold: 0.6 }
    );
    slideEls.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    videoEls.current.forEach((el, index) => {
      if (index === activeIndex) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
    const video = items[activeIndex];
    if (video && signedIn && !viewedIds.current.has(video.id)) {
      viewedIds.current.add(video.id);
      fetch(`/api/videos/${video.id}/view`, { method: "POST" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  const active = items[activeIndex] ?? null;

  function updateItem(id: string, patch: Partial<FeedVideo>) {
    setItems((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function requireSignIn(): boolean {
    if (signedIn) return false;
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return true;
  }

  async function rate(value: RatingValue) {
    if (!active || requireSignIn()) return;
    const res = await fetch(`/api/videos/${active.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const data: RateResponse = await res.json();
      const count = data.counts.burnt + data.counts.popped + data.counts.butter;
      updateItem(active.id, {
        myRating: value,
        score:
          count < MIN_RATINGS_FOR_SCORE
            ? { kind: "new", count }
            : {
                kind: "scored",
                score: data.score,
                count,
                fresh: data.score >= FRESH_POP_THRESHOLD,
              },
      });
      // Let the pop land, then close.
      setTimeout(() => setSheet(null), 450);
    }
  }

  async function toggleSave(channelId: string, save: boolean) {
    if (!active || requireSignIn()) return;
    const res = await fetch(`/api/channels/${channelId}/videos`, {
      method: save ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: active.id }),
    });
    if (res.ok) {
      updateItem(active.id, {
        savedInChannelIds: save
          ? [...active.savedInChannelIds, channelId]
          : active.savedInChannelIds.filter((id) => id !== channelId),
      });
    }
  }

  async function createChannel(name: string): Promise<MyChannel | null> {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const channel: MyChannel = {
      id: data.channel.id,
      name: data.channel.name,
      emoji: data.channel.emoji,
    };
    setMyChannels((prev) => [...prev, channel]);
    return channel;
  }

  function seekActive(seconds: number) {
    const el = videoEls.current.get(activeIndex);
    if (el) {
      el.currentTime = seconds;
      el.play().catch(() => {});
    }
    setSheet(null);
  }

  function goToVideo(id: string) {
    const index = items.findIndex((v) => v.id === id);
    if (index >= 0) {
      slideEls.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/watch/${id}`);
    }
  }

  function advance(fromIndex: number) {
    if (fromIndex + 1 < items.length) {
      slideEls.current.get(fromIndex + 1)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-8 text-center text-ink-soft">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="no-scrollbar h-[calc(100dvh-4rem)] snap-y snap-mandatory overflow-y-auto bg-[#141311]"
      >
        {items.map((video, index) => (
          <VideoSlide
            key={video.id}
            video={video}
            index={index}
            isActive={index === activeIndex}
            registerSlide={registerSlide}
            registerVideo={registerVideo}
            onOpenSheet={(kind) => {
              if ((kind === "rate" || kind === "save") && requireSignIn()) return;
              setSheet(kind);
            }}
            onEnded={() => advance(index)}
            onNextEpisode={goToVideo}
          />
        ))}
      </div>

      {sheet === "rate" && active && (
        <RateSheet current={active.myRating} onRate={rate} onClose={() => setSheet(null)} />
      )}
      {sheet === "save" && active && (
        <SaveSheet
          channels={myChannels}
          savedIn={active.savedInChannelIds}
          onToggle={toggleSave}
          onCreateChannel={createChannel}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "comments" && active && (
        <CommentsSheet
          videoId={active.id}
          signedIn={signedIn}
          getCurrentTime={() => videoEls.current.get(activeIndex)?.currentTime ?? 0}
          onSeek={seekActive}
          onPosted={() => updateItem(active.id, { commentCount: active.commentCount + 1 })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "detail" && active && (
        <DetailSheet video={active} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
