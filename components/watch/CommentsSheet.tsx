"use client";

import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import Avatar from "@/components/Avatar";
import { formatTimecode, timeAgo } from "@/lib/format";
import type { CommentDto } from "./types";

// Timecoded comments: each comment can pin to a moment; tapping the time
// chip seeks the video there. The composer auto-stamps the current time —
// one tap removes the stamp.
export default function CommentsSheet({
  videoId,
  signedIn,
  getCurrentTime,
  onSeek,
  onPosted,
  onClose,
}: {
  videoId: string;
  signedIn: boolean;
  getCurrentTime: () => number;
  onSeek: (seconds: number) => void;
  onPosted: () => void;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentDto[] | null>(null);
  const [text, setText] = useState("");
  const [stamp, setStamp] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

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
      setComments((prev) => [data.comment, ...(prev ?? [])]);
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
            className="w-full rounded-2xl border-2 border-line bg-surface p-3 text-lg outline-none focus:border-accent"
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
              className="ml-auto min-h-12 rounded-2xl bg-accent px-6 font-bold text-white disabled:opacity-40"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="text-[15px] font-semibold text-accent">{error}</p>}
        </form>
      ) : (
        <p className="mb-4 rounded-2xl bg-bg p-4 text-center">
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
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar emoji={c.user.avatarEmoji} color={c.user.avatarColor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  <span className="font-bold">{c.user.displayName}</span>{" "}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
