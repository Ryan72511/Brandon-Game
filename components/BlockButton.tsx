"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Block/unblock a creator — their videos and comments disappear for you.
export default function BlockButton({
  username,
  blocked: initialBlocked,
  signedIn,
  compact = false,
}: {
  username: string;
  blocked: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    if (!signedIn) {
      router.push(`/login?next=/creator/${username}`);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/blocks", {
      method: blocked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setBusy(false);
    if (res.ok) {
      setBlocked(!blocked);
      router.refresh();
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={blocked}
        className={`min-h-8 text-[13px] font-bold underline disabled:opacity-40 ${
          blocked ? "text-accent" : "text-ink-soft"
        }`}
      >
        {blocked ? "Unblock" : "Block"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={blocked}
      className={`min-h-12 rounded-xl border-2 px-4 font-bold disabled:opacity-40 ${
        blocked ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-soft"
      }`}
    >
      {blocked ? "Unblock" : "Block this creator"}
    </button>
  );
}
