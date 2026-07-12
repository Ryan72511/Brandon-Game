"use client";

import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "@/components/Avatar";
import { formatTimecode, timeAgo } from "@/lib/format";
import type { CommentDto } from "./types";
import ReportControl from "@/components/ReportControl";

// Timecoded comments: each comment can pin to a moment; tapping the time
// chip seeks the video. The creator of the video can pin one comment to the
// top, and their own comments carry a Creator badge.
export default function CommentsSheet({
  videoId,
  signedIn,
  creatorUsername,
  viewerIsCreator,
  getCurrentTime,
  onSeek,
  onPosted,
  onClose,
}: {
  videoId: string;
  signedIn: boolean;
  creatorUsername: string;
  viewerIsCreator: boolean;
  getCurrentTime: () => number;
  onSeek: (seconds: number) => void;
  onPosted: () => void;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentDto[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [stamp, setStamp] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments ?? []);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments?cursor=${nextCursor}`);
      const data = await res.json();
      // Dedupe by id: pin changes between pages can shift the ordering the
      // cursor walks, and a freshly posted comment is already in the list.
      setComments((prev) => {
        const seen = new Set((prev ?? []).map((c) => c.id));
        const fresh = (data.comments ?? []).filter((c: CommentDto) => !seen.has(c.id));
        return [...(prev ?? []), ...fresh];
      });
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  async function togglePin(comment: CommentDto) {
    const res = await fetch(`/api/comments/${comment.id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !comment.pinned }),
    });
    if (res.ok) {
      setComments((prev) => {
        if (!prev) return prev;
        const updated = prev.map((c) => ({
          ...c,
          pinned: c.id === comment.id ? !comment.pinned : false,
        }));
        // Keep the pinned comment on top.
        return [...updated].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned)
        );
      });
    }
  }

  function openComposer() {
    setStamp(Math.floor(getCurrentTime()));
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError("");
    const res = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), timecodeSec: stamp }),
    });
    setPosting(false);
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => {
        const pinnedOnes = (prev ?? []).filter((c) => c.pinned);
        const rest = (prev ?? []).filter((c) => !c.pinned);
        return [...pinnedOnes, data.comment, ...rest];
      });
      setText("");
      setStamp(null);
      onPosted();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't post that. Try again.");
    }
  }

  return (
    <Sheet title="Comments" onClose={onClose}>
      {signedIn ? (
        <form onSubmit={post} className="mb-4 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => stamp === null && openComposer()}
            placeholder="Say something nice…"
            aria-label="Write a comment"
            maxLength={500}
            rows={2}
            className="w-full rounded-xl border-2 border-line bg-surface p-3 text-lg outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            {stamp !== null && (
              <button
                type="button"
                onClick={() => setStamp(null)}
                className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-[15px] font-bold text-accent"
                title="Remove the time stamp"
              >
                at {formatTimecode(stamp)} ✕
              </button>
            )}
            <button
              type="submit"
              disabled={!text.trim() || posting}
              className="ml-auto min-h-12 rounded-xl bg-accent px-6 font-bold text-white disabled:opacity-40"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="text-[15px] font-semibold text-accent">{error}</p>}
        </form>
      ) : (
        <p className="mb-4 rounded-xl bg-bg p-4 text-center">
          <a href="/login" className="font-bold text-accent underline">
            Sign in
          </a>{" "}
          to join the conversation.
        </p>
      )}

      {comments === null ? (
        <p className="py-6 text-center text-ink-soft">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-ink-soft">No comments yet. Be the first!</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className={`flex gap-3 ${c.pinned ? "-mx-2 rounded-xl bg-gold-soft/60 px-2 py-2" : ""}`}
              >
                <Avatar emoji={c.user.avatarEmoji} color={c.user.avatarColor} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[15px]">
                    <span className="font-bold">{c.user.displayName}</span>
                    {c.user.username === creatorUsername && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                        Creator
                      </span>
                    )}
                    {c.pinned && (
                      <span className="text-[12px] font-bold text-ink-soft">📌 Pinned</span>
                    )}
                    <span className="text-ink-soft">· {timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="break-words">
                    {c.timecodeSec !== null && (
                      <button
                        onClick={() => onSeek(c.timecodeSec!)}
                        className="mr-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[14px] font-bold text-accent"
                        title="Jump to this moment"
                      >
                        ▶ {formatTimecode(c.timecodeSec)}
                      </button>
                    )}
                    {c.text}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    {viewerIsCreator && (
                      <button
                        onClick={() => togglePin(c)}
                        className="text-[13px] font-bold text-accent"
                      >
                        {c.pinned ? "Unpin" : "Pin to top"}
                      </button>
                    )}
                    {signedIn && (
                      <ReportControl targetType="comment" targetId={c.id} signedIn compact />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 min-h-12 w-full rounded-xl border-2 border-line bg-surface font-bold text-ink-soft disabled:opacity-40"
            >
              {loadingMore ? "Loading…" : "Show more comments"}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
