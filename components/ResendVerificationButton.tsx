"use client";

import { useState } from "react";
import { useAction } from "@/lib/useAction";

// One-tap resend of the verification email for a signed-in, unverified user.
export default function ResendVerificationButton() {
  const { busy, error, run } = useAction();
  const [sent, setSent] = useState(false);

  async function send() {
    const data = await run("/api/auth/verify/request", { method: "POST" });
    if (data) setSent(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={send}
        disabled={busy || sent}
        className="min-h-12 rounded-full border-2 border-line bg-surface px-5 font-bold disabled:opacity-40"
      >
        {busy ? "One moment…" : sent ? "Sent — check your inbox ✓" : "Resend verification email"}
      </button>
      {error && <p className="font-semibold text-accent">{error}</p>}
    </div>
  );
}
