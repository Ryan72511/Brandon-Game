"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "@/lib/useAction";
import RecoveryCodeCard from "@/components/RecoveryCodeCard";

// Reset a forgotten password using the recovery code from signup. On success
// the server hands back a fresh code, so we show the same "save this" screen.
export default function ResetForm() {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = await run<{ recoveryCode?: string }>("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, recoveryCode, newPassword }),
    });
    if (data?.recoveryCode) setNewCode(data.recoveryCode);
  }

  if (newCode) {
    return (
      <RecoveryCodeCard
        code={newCode}
        heading="Save your new recovery code"
        actionLabel="I saved it — let’s go"
        onDone={() => {
          router.push("/");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="like sunny_dan"
            autoComplete="username"
            maxLength={20}
            required
            className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Recovery code
          <input
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="like sunny-otter-glow-47"
            maxLength={60}
            required
            className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
          />
        </label>
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
          {busy ? "One moment…" : "Reset password"}
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
