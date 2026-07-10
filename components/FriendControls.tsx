"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddFriendForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setUsername("");
      setMessage({
        ok: true,
        text: data.status === "accepted" ? "You're friends now! 🎉" : "Invite sent!",
      });
      router.refresh();
    } else {
      setMessage({ ok: false, text: data.error ?? "That didn't work. Try again." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="their username"
          aria-label="Friend's username"
          maxLength={20}
          className="min-h-14 flex-1 rounded-xl border-2 border-line bg-surface px-4 text-lg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!username.trim() || busy}
          className="min-h-14 rounded-xl bg-accent px-6 font-bold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Invite"}
        </button>
      </div>
      {message && (
        <p className={`font-semibold ${message.ok ? "text-good" : "text-accent"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export default function FriendControls({ friendshipId }: { friendshipId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "accept" | "decline") {
    if (busy) return;
    setBusy(true);
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act("accept")}
        disabled={busy}
        className="min-h-12 rounded-full bg-accent px-4 font-bold text-white disabled:opacity-40"
      >
        Yes!
      </button>
      <button
        onClick={() => act("decline")}
        disabled={busy}
        className="min-h-12 rounded-full border-2 border-line bg-surface px-4 font-bold text-ink-soft disabled:opacity-40"
      >
        No thanks
      </button>
    </div>
  );
}
