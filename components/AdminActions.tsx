"use client";

import { useState } from "react";
import { useAction } from "@/lib/useAction";

// One small button = one moderation action posted to /api/admin/moderate.
// Destructive actions (remove/suspend/reject) use the same two-tap
// arm/confirm pattern as DeleteVideoButton — no browser dialogs, no way
// to nuke content with a single stray tap.
export function AdminActionButton({
  label,
  payload,
  destructive = false,
}: {
  label: string;
  payload: Record<string, unknown>;
  destructive?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const { busy, error, run } = useAction();

  async function go() {
    const data = await run(
      "/api/admin/moderate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { refresh: true }
    );
    if (data) setArmed(false);
  }

  if (destructive && !armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="min-h-11 rounded-xl border-2 border-line bg-surface px-4 text-[15px] font-bold text-accent"
      >
        {label}
      </button>
    );
  }

  if (destructive) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="min-h-11 rounded-xl bg-accent px-4 text-[15px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "Working…" : `Yes, ${label.toLowerCase()}`}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={busy}
          className="min-h-11 rounded-xl border-2 border-line bg-surface px-4 text-[15px] font-bold"
        >
          Cancel
        </button>
        {error && <span className="text-[14px] font-semibold text-accent">{error}</span>}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="min-h-11 rounded-xl border-2 border-line bg-surface px-4 text-[15px] font-bold disabled:opacity-40"
      >
        {busy ? "Working…" : label}
      </button>
      {error && <span className="text-[14px] font-semibold text-accent">{error}</span>}
    </span>
  );
}
