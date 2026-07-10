"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODE_CREATING, MODE_WATCHING } from "@/lib/constants";

// The Airbnb-style switch. One tap, no confirmation, the tab bar re-skins.
export default function ModeSwitch({ mode }: { mode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const creating = mode === MODE_CREATING;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: creating ? MODE_WATCHING : MODE_CREATING }),
    });
    setBusy(false);
    if (res.ok) {
      router.push(creating ? "/" : "/studio");
      router.refresh();
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-accent px-5 font-bold text-white shadow-card disabled:opacity-60"
    >
      <span className="text-2xl" aria-hidden>
        {creating ? "▶" : "🎬"}
      </span>
      <span className="flex-1 text-left">
        {creating ? "Switch to Watching" : "Switch to Creating"}
      </span>
      <span className="text-[14px] font-semibold text-white/85">
        {creating ? "Back to the couch" : "Make your own videos"}
      </span>
    </button>
  );
}
