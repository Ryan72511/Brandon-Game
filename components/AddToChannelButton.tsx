"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One-tap "Add" over a recommended video card on your own channel page.
export default function AddToChannelButton({
  channelId,
  videoId,
}: {
  channelId: string;
  videoId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    setState("busy");
    const res = await fetch(`/api/channels/${channelId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    if (res.ok) {
      setState("done");
      setTimeout(() => router.refresh(), 600);
    } else {
      setState("idle");
    }
  }

  return (
    <button
      onClick={add}
      disabled={state !== "idle"}
      className="absolute right-3 top-3 z-10 min-h-12 rounded-full bg-accent px-4 font-bold text-white shadow-card disabled:opacity-70"
    >
      {state === "done" ? "Added ✓" : state === "busy" ? "…" : "＋ Add"}
    </button>
  );
}
