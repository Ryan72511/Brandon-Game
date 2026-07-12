"use client";

import { useState } from "react";
import { useAction } from "@/lib/useAction";

// Change your password while signed in. Requires the current one.
export default function ChangePasswordForm() {
  const { busy, error, run } = useAction();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const data = await run("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (data) {
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-semibold">
        Current password
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setSaved(false);
          }}
          autoComplete="current-password"
          required
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        New password
        <input
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setSaved(false);
          }}
          placeholder="at least 6 characters"
          autoComplete="new-password"
          required
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      {error && <p className="font-semibold text-accent">{error}</p>}
      {saved && <p className="font-semibold text-accent">Saved ✓</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-14 rounded-xl bg-accent text-lg font-bold text-white disabled:opacity-40"
      >
        {busy ? "One moment…" : "Change password"}
      </button>
    </form>
  );
}
