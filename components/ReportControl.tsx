"use client";

import { useState } from "react";

// One reusable "Report" control: tap → pick a reason → done. Used for
// videos (detail sheet), creators (profile page), and comments.
const REASONS: [string, string][] = [
  ["not_for_kids", "Not right for kids"],
  ["harmful", "Harmful or bullying"],
  ["hateful", "Hateful"],
  ["copyright", "Stolen or copyrighted"],
  ["spam", "Spam or scam"],
  ["other", "Something else"],
];

export default function ReportControl({
  targetType,
  targetId,
  signedIn,
  compact = false,
}: {
  targetType: "video" | "creator" | "comment";
  targetId: string;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function report(reason: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
    }
  }

  if (!signedIn) {
    return (
      <a
        href="/login"
        className={compact ? "text-[13px] font-semibold text-ink-soft underline" : "text-[15px] font-semibold text-ink-soft underline"}
      >
        Sign in to report
      </a>
    );
  }
  if (done) {
    return (
      <p className={compact ? "text-[13px] font-semibold text-good" : "text-[15px] font-semibold text-good"}>
        Thanks — our moderators will take a look.
      </p>
    );
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? "min-h-8 text-[13px] font-bold text-ink-soft underline"
            : "min-h-12 rounded-xl border-2 border-line bg-surface px-4 font-bold text-ink-soft"
        }
      >
        {targetType === "creator" ? "Report this creator" : compact ? "Report" : "Report this video"}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg p-3">
      <p className="text-[15px] font-bold">What&apos;s wrong with it?</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => report(value)}
            disabled={busy}
            className="min-h-11 rounded-full border-2 border-line bg-surface px-3 text-[14px] font-semibold disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="self-start text-[14px] font-semibold text-ink-soft underline">
        Never mind
      </button>
    </div>
  );
}
