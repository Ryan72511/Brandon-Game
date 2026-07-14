"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "@/lib/useAction";

// Finish an emailed password reset: the ?token= comes from the link, the
// user picks a new password, and on success they're already signed in.
export default function ResetConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { busy, error, run } = useAction();
  const [newPassword, setNewPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = await run("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    if (data) {
      router.push("/");
      router.refresh();
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="font-semibold">
          This link is missing its code. Open the link from your email again, or ask for a new
          one on the{" "}
          <Link href="/forgot" className="text-accent underline">
            forgot-password page
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="at least 6 characters"
            autoComplete="new-password"
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
          {busy ? "One moment…" : "Set new password"}
        </button>
      </form>
      <p className="mt-4 text-center text-[14px]">
        <Link href="/login" className="font-semibold text-accent underline">
          Remembered it? Sign in
        </Link>
      </p>
    </div>
  );
}
