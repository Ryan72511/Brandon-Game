"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Permanent deletion with a typed confirmation. Plain words about exactly
// what goes away — including uploaded videos.
export default function DeleteAccountButton({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't work. Try again.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-12 rounded-xl border-2 border-line bg-surface font-bold text-accent"
      >
        Delete account
      </button>
    );
  }
  return (
    <form onSubmit={deleteAccount} className="flex flex-col gap-3 rounded-xl border-2 border-accent bg-accent-soft p-4">
      <p className="font-bold">Delete your account for good?</p>
      <p className="text-[15px] text-ink-soft">
        This permanently removes your profile, your channels, your comments and ratings,
        your watch history — and every video you&apos;ve uploaded. There&apos;s no undo.
      </p>
      <label className="flex flex-col gap-1 text-[15px] font-semibold">
        Type your username ({username}) to confirm
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={username}
          autoComplete="off"
          className="min-h-12 rounded-xl border-2 border-line bg-surface px-3 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-[15px] font-semibold text-accent">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={confirm !== username || busy}
          className="min-h-12 flex-1 rounded-xl bg-accent font-bold text-white disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete everything"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
          className="min-h-12 flex-1 rounded-xl border-2 border-line bg-surface font-bold"
        >
          Keep my account
        </button>
      </div>
    </form>
  );
}
