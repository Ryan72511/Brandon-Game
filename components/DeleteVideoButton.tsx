"use client";

import { useState } from "react";
import { useAction } from "@/lib/useAction";

// Two-step delete: the first tap arms an inline confirm — no browser
// dialogs, and no way to lose a video with a single stray tap.
export default function DeleteVideoButton({ videoId }: { videoId: string }) {
  const [armed, setArmed] = useState(false);
  const { busy, error, run } = useAction();

  async function confirmDelete() {
    await run(
      `/api/videos/${videoId}`,
      { method: "DELETE" },
      { redirect: () => "/studio", refresh: true }
    );
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-12 w-full rounded-xl border-2 border-line bg-surface font-bold text-accent"
      >
        Delete this video
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-line bg-surface p-4">
      <p className="font-bold">Delete this video?</p>
      <p className="text-[15px] text-ink-soft">
        It disappears for everyone, along with its ratings and comments. This can&apos;t be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmDelete}
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl bg-accent font-bold text-white disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Yes, delete it"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl border-2 border-line bg-surface font-bold"
        >
          Keep it
        </button>
      </div>
      {error && <p className="font-semibold text-accent">{error}</p>}
    </div>
  );
}
