"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction } from "@/lib/useAction";

// Consumes the ?token= from the emailed verification link. An explicit
// button (not auto-fire on mount) so link-prefetching mail scanners and dev
// double-renders can't burn the one-time token behind the user's back.
export default function VerifyForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { busy, error, run } = useAction();
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = await run(
      "/api/auth/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      },
      { refresh: true }
    );
    if (data) setDone(true);
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="font-semibold">
          This link is missing its code. Open the link from your email again, or ask for a fresh
          one in{" "}
          <Link href="/settings" className="text-accent underline">
            Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <p className="text-lg font-semibold">Your email is confirmed 🎉</p>
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white"
        >
          Start watching
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
      <button
        type="submit"
        disabled={busy}
        className="min-h-14 rounded-xl bg-accent text-lg font-bold text-white disabled:opacity-40"
      >
        {busy ? "One moment…" : "Confirm my email"}
      </button>
      {error && <p className="text-center font-semibold text-accent">{error}</p>}
    </form>
  );
}
