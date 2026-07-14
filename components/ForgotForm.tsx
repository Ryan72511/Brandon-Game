"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/lib/useAction";

// Ask for a password-reset link by email. The server answers the same way
// for known and unknown addresses, so this screen never reveals who has an
// account.
export default function ForgotForm() {
  const { busy, error, run } = useAction();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = await run("/api/auth/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (data) setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-semibold">Check your inbox 📬</p>
        <p className="mt-2 text-ink-soft">
          If that email has a Gasp account, a reset link is on its way. It works for 1 hour.
        </p>
        <p className="mt-4 text-[14px]">
          <Link href="/login" className="font-semibold text-accent underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="like you@email.com"
            autoComplete="email"
            inputMode="email"
            maxLength={120}
            required
            className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
          />
        </label>
        {error && <p className="font-semibold text-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="min-h-14 rounded-xl bg-accent text-lg font-bold text-white disabled:opacity-40"
        >
          {busy ? "One moment…" : "Email me a reset link"}
        </button>
      </form>
      <p className="mt-4 text-center text-[14px]">
        <Link href="/reset" className="font-semibold text-accent underline">
          Have a recovery code? Use it instead
        </Link>
      </p>
      <p className="mt-2 text-center text-[14px]">
        <Link href="/login" className="font-semibold text-accent underline">
          Remembered it? Sign in
        </Link>
      </p>
    </div>
  );
}
